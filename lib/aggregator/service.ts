import { PrismaClient, Prisma } from '@/app/generated/prisma/client';

const prisma = new PrismaClient();

type PayloadRow = {
  id?: string | number;
  itemId?: string | number;
  sku?: string | number;
  code?: string | number;
  name?: string;
  title?: string;
  description?: string;
  category?: string | { title?: string } | null;
  quantity?: number | string;
  price?: number | string;
  unitPrice?: number | string;
  totalPrice?: number | string;
  total?: number | string;
  amount?: number | string;
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toSku(row: PayloadRow): string {
  return String(row.id ?? row.itemId ?? row.sku ?? row.code ?? row.name ?? '').trim();
}

function toCategory(category: PayloadRow['category']): string | null {
  if (!category) return null;
  if (typeof category === 'string') {
    const normalized = category.trim();
    return normalized || null;
  }
  const normalized = String(category.title ?? '').trim();
  return normalized || null;
}

async function aggregateCatalogRows(params: {
  rows: PayloadRow[];
  storeId: string;
  businessDate: Date;
}) {
  const { rows, storeId, businessDate } = params;

  for (const rawRow of rows) {
    const row = rawRow ?? {};
    const sku = toSku(row);
    if (!sku) continue;

    const quantity = Math.max(0, toNumber(row.quantity));
    const unitPrice = toNumber(row.price ?? row.unitPrice);
    const fallbackTotal = quantity > 0 ? unitPrice * quantity : 0;
    const grossAmount = Math.max(0, toNumber(row.totalPrice ?? row.total ?? row.amount) || fallbackTotal);

    if (quantity <= 0 && grossAmount <= 0) continue;

    const name = String(row.title ?? row.name ?? row.description ?? sku).trim() || sku;
    const category = toCategory(row.category);
    const avgPrice = quantity > 0 ? grossAmount / quantity : unitPrice;

    const menuItem = await prisma.menuItem.upsert({
      where: { sku },
      update: {
        name,
        category: category ?? undefined,
        price: unitPrice || avgPrice || 0,
      },
      create: {
        sku,
        name,
        category,
        price: unitPrice || avgPrice || 0,
      },
    });

    await prisma.catalogItemDaily.upsert({
      where: {
        itemId_storeId_businessDate: {
          itemId: menuItem.id,
          storeId,
          businessDate,
        },
      },
      update: {
        quantity: { increment: quantity },
        grossAmount: { increment: grossAmount },
        avgPrice,
      },
      create: {
        itemId: menuItem.id,
        storeId,
        businessDate,
        quantity,
        grossAmount,
        avgPrice,
      },
    });
  }
}

export async function aggregateSales() {
  const unprocessed = await prisma.ingressEvent.findMany({
    where: { processedAt: null },
    orderBy: { createdAt: 'asc' },
    take: 500, // b dim
  });

  for (const event of unprocessed) {
    const payload = event.payload as any;
    const idempotencyKey = payload?.idempotencyKey;
    if (!idempotencyKey) {
      console.warn('Missing idempotencyKey in event', event.id);
      continue;
    }

    
    const existing = await prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
    if (existing) {
      console.log('Duplicate idempotencyKey, skipping', idempotencyKey);
      await prisma.ingressEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date() },
      });
      continue;
    }


    await prisma.idempotencyKey.create({ data: { key: idempotencyKey } });

 
    const uniqueKey = payload?.uniqueKey;
    const businessDate = payload?.jobDateTime ? new Date(payload.jobDateTime) : null;
    const amount = Number(payload?.amount) || 0;
    const documentType = payload?.documentType?.title || 'Sconosciuto';
    const storeId = payload?.store?.id;
    const operatorId = payload?.operator?.id;
    const rows = Array.isArray(payload?.rows) ? (payload.rows as PayloadRow[]) : [];

    if (!uniqueKey || !businessDate || !storeId) {
      console.warn('Missing required fields for aggregation', { uniqueKey, businessDate, storeId });
      continue;
    }

    
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


    const totalAmount = payload?.rows?.reduce((sum: number, row: any) => {
      return sum + (row.price * row.quantity);
    }, 0) || amount;

    const totalNetAmount = totalAmount * 0.9; 

    await aggregateCatalogRows({
      rows,
      storeId: store.id,
      businessDate,
    });

   
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

    
    await prisma.ingressEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date() },
    });
  }

  console.log(`Processed ${unprocessed.length} ingress events`);
}
