import { NextRequest, NextResponse } from "next/server";

import { IngressSource } from "@/app/generated/prisma/enums";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ingressPayloadSchema } from "@/lib/ingress/schemas";

async function persistPayload(source: IngressSource, payload: Prisma.InputJsonValue) {
  const eventData = payload as any;
  const idempotencyKey = eventData?.idempotencyKey;

 
  if (idempotencyKey) {
    const existingKey = await prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
    if (existingKey) {
      console.log('Duplicate idempotencyKey detected:', idempotencyKey);
      return NextResponse.json(
        { 
          error: "DUPLICATE_TRANSACTION",
          message: "Transaction already processed",
          idempotencyKey: idempotencyKey,
          processedAt: existingKey.createdAt
        },
        { status: 409 } 
      );
    }
  }

  const record = await prisma.ingressEvent.create({
    data: {
      source,
      payload,
    },
  });

  try {
    console.log("Processing event immediately:", record.id);
    
    const uniqueKey = eventData?.uniqueKey;
    const businessDate = eventData?.jobDateTime ? new Date(eventData.jobDateTime) : null;
    const amount = Number(eventData?.amount) || 0;
    const documentType = eventData?.documentType?.title || 'Sconosciuto';
    const storeId = eventData?.store?.id;

    if (!idempotencyKey || !uniqueKey || !businessDate || !storeId) {
      console.warn('Missing required fields for aggregation', { idempotencyKey, uniqueKey, businessDate, storeId });
    } else {
     
      await prisma.idempotencyKey.create({ data: { key: idempotencyKey } });

      const store = await prisma.store.upsert({
        where: { code: String(storeId) },
        update: { 
          uniqueKey,
          companyName: eventData?.company?.title,
          corporateName: eventData?.corporate?.title,
        },
        create: {
          code: String(storeId),
          uniqueKey,
          name: eventData?.store?.title || `Store ${storeId}`,
          companyName: eventData?.company?.title,
          corporateName: eventData?.corporate?.title,
          address: eventData?.store?.address,
          city: eventData?.store?.collective,
          region: eventData?.store?.province,
          timezone: 'Europe/Rome',
        },
      });

     
      const totalAmount = eventData?.rows?.reduce((sum: number, row: any) => {
        return sum + (row.price * row.quantity);
      }, 0) || amount;

      const totalNetAmount = totalAmount * 0.9; 

     
      await prisma.overviewDailyMetrics.create({
        data: {
          businessDate,
          storeId: store.id,
          grossAmount: totalAmount,
          netAmount: totalNetAmount,
          salesCount: 1,
          avgTicket: totalAmount,
          coversCount: eventData?.rows?.length || 1,
          avgCover: totalAmount / (eventData?.rows?.length || 1),
          timeSlotBreakdown: [{
            hour: businessDate.getHours().toString().padStart(2, '0') + ':00',
            sales: 1,
            covers: eventData?.rows?.length || 1,
          }],
        },
      });

     
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

      console.log('Event processed and aggregated:', totalAmount + '€');
    }

    await prisma.ingressEvent.update({
      where: { id: record.id },
      data: { processedAt: new Date() },
    });
    
    console.log("Event processing completed for:", record.id);
  } catch (error) {
    console.error("Event processing failed:", error);
  }

  return NextResponse.json(
    {
      id: record.id,
      source: record.source,
      storedAt: record.createdAt,
    },
    { status: 201 },
  );
}

async function parseJsonBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function handleIngressRequest(source: IngressSource, request: NextRequest) {
  const body = await parseJsonBody(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = ingressPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload must be a valid JSON object" }, { status: 400 });
  }

  try {
    return await persistPayload(source, parsed.data as Prisma.InputJsonValue);
  } catch (error) {
    console.error(`Ingress ${source} persist error`, error);
    return NextResponse.json({ error: "Unable to persist payload" }, { status: 500 });
  }
}

export async function handleRawIngressRequest(source: IngressSource, request: NextRequest) {
  const body = await parseJsonBody(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Payload must be a JSON object" }, { status: 400 });
  }

  try {
    return await persistPayload(source, body as Prisma.InputJsonValue);
  } catch (error) {
    console.error(`Ingress raw ${source} persist error`, error);
    return NextResponse.json({ error: "Unable to persist payload" }, { status: 500 });
  }
}
