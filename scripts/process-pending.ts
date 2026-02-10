import { PrismaClient } from '../app/generated/prisma/client';

const prisma = new PrismaClient();

async function processPendingEvents() {
  console.log('Processing pending events...');
  
  // Get all unprocessed events
  const unprocessed = await prisma.ingressEvent.findMany({
    where: { processedAt: null },
    orderBy: { createdAt: 'asc' },
    take: 10, // Process max 10 at a time
  });

  console.log(`Found ${unprocessed.length} events to process`);

  for (const event of unprocessed) {
    const payload = event.payload as any;
    console.log(`\nProcessing event ${event.id.slice(-8)}: ${payload.amount}€`);
    
    try {
      const idempotencyKey = payload?.idempotencyKey;
      const uniqueKey = payload?.uniqueKey;
      const businessDate = payload?.jobDateTime ? new Date(payload.jobDateTime) : null;
      const amount = Number(payload?.amount) || 0;
      const documentType = payload?.documentType?.title || 'Sconosciuto';
      const storeId = payload?.store?.id;

      if (!idempotencyKey || !uniqueKey || !businessDate || !storeId) {
        console.warn('  Missing required fields, skipping');
        await prisma.ingressEvent.update({
          where: { id: event.id },
          data: { processedAt: new Date() }
        });
        continue;
      }

      // Check idempotency
      const existingKey = await prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
      if (existingKey) {
        console.log('  Duplicate idempotencyKey, skipping');
        await prisma.ingressEvent.update({
          where: { id: event.id },
          data: { processedAt: new Date() }
        });
        continue;
      }

      // Store idempotencyKey
      await prisma.idempotencyKey.create({ data: { key: idempotencyKey } });

      // Create or update store
      const store = await prisma.store.upsert({
        where: { code: String(storeId) },
        update: { uniqueKey },
        create: {
          code: String(storeId),
          uniqueKey,
          name: payload?.store?.title || `Store ${storeId}`,
          address: payload?.store?.address,
          city: payload?.store?.collective,
          region: payload?.store?.province,
          timezone: 'Europe/Rome',
        },
      });

      // Calculate totals from rows
      const totalAmount = payload?.rows?.reduce((sum: number, row: any) => {
        return sum + (row.price * row.quantity);
      }, 0) || amount;

      // Create overview metrics
      await prisma.overviewDailyMetrics.create({
        data: {
          businessDate,
          storeId: store.id,
          grossAmount: totalAmount,
          netAmount: totalAmount * 0.9,
          salesCount: 1,
          avgTicket: totalAmount,
          coversCount: payload?.rows?.length || 1,
          avgCover: totalAmount / (payload?.rows?.length || 1),
          timeSlotBreakdown: [{
            hour: businessDate.getHours().toString().padStart(2, '0') + ':00',
            sales: 1,
            covers: payload?.rows?.length || 1,
          }],
        },
      });

      // Create sales data
      await prisma.salesStoreDaily.create({
        data: {
          businessDate,
          storeId: store.id,
          grossAmount: totalAmount,
          salesCount: 1,
          avgTicket: totalAmount,
          documentBreakdown: [{
            documentType,
            grossAmount: totalAmount,
            salesCount: 1,
          }],
        },
      });

      // Mark as processed
      await prisma.ingressEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date() }
      });

      console.log(`  Processed: ${totalAmount}€`);

    } catch (error) {
      console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('\nProcessing completed');
  
  // Show final stats
  const store = await prisma.store.findFirst({
    where: { uniqueKey: 'instance1-50-75-77' }
  });
  
  if (store) {
    const metrics = await prisma.overviewDailyMetrics.aggregate({
      where: { storeId: store.id },
      _sum: { salesCount: true, grossAmount: true },
      _count: true
    });
    
    console.log(`\nFinal Stats:`);
    console.log(`- Total records: ${metrics._count}`);
    console.log(`- Total sales: ${metrics._sum.salesCount || 0}`);
    console.log(`- Total amount: ${(metrics._sum.grossAmount || 0)}€`);
  }
  
  await prisma.$disconnect();
}

processPendingEvents().catch(console.error);
