import { PrismaClient, Prisma } from '@/app/generated/prisma/client';

const prisma = new PrismaClient();

export async function aggregateSales() {
  const unprocessed = await prisma.ingressEvent.findMany({
    where: { processedAt: null },
    orderBy: { createdAt: 'asc' },
    take: 500, // batch size
  });

  for (const event of unprocessed) {
    const payload = event.payload as any;
    const idempotencyKey = payload?.idempotencyKey;
    if (!idempotencyKey) {
      console.warn('Missing idempotencyKey in event', event.id);
      continue;
    }

    // Deduplicate
    const existing = await prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
    if (existing) {
      console.log('Duplicate idempotencyKey, skipping', idempotencyKey);
      await prisma.ingressEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date() },
      });
      continue;
    }

    // Store idempotencyKey
    await prisma.idempotencyKey.create({ data: { key: idempotencyKey } });

    // Extract fields
    const uniqueKey = payload?.uniqueKey;
    const businessDate = payload?.jobDateTime ? new Date(payload.jobDateTime) : null;
    const amount = Number(payload?.amount) || 0;
    const documentType = payload?.documentType?.title || 'Sconosciuto';
    const storeId = payload?.store?.id;
    const operatorId = payload?.operator?.id;
    const deviceId = payload?.device?.id;

    if (!uniqueKey || !businessDate || !storeId) {
      console.warn('Missing required fields for aggregation', { uniqueKey, businessDate, storeId });
      continue;
    }

    // Create or update store if needed
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

    const totalNetAmount = totalAmount * 0.9; // Assuming 10% tax

    // Update overview daily metrics
    await prisma.overviewDailyMetrics.upsert({
      where: {
        storeId_businessDate: {
          storeId: store.id,
          businessDate,
        },
      },
      update: {
        grossAmount: { increment: totalAmount },
        netAmount: { increment: totalNetAmount },
        salesCount: { increment: 1 },
        avgTicket: totalAmount,
        coversCount: { increment: payload?.rows?.length || 1 },
        avgCover: totalAmount / (payload?.rows?.length || 1),
      },
      create: {
        businessDate,
        storeId: store.id,
        grossAmount: totalAmount,
        netAmount: totalNetAmount,
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

    // Update sales store daily with document breakdown
    await prisma.salesStoreDaily.upsert({
      where: {
        storeId_businessDate: {
          storeId: store.id,
          businessDate,
        },
      },
      update: {
        grossAmount: { increment: totalAmount },
        salesCount: { increment: 1 },
        avgTicket: totalAmount,
        documentBreakdown: {
          push: {
            documentType,
            grossAmount: totalAmount,
            salesCount: 1,
          },
        },
      },
      create: {
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

    console.log('Aggregated data for store:', storeId, 'amount:', totalAmount);

    // Mark event as processed
    await prisma.ingressEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date() },
    });
  }

  console.log(`Processed ${unprocessed.length} ingress events`);
}
