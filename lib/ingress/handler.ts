import { NextRequest, NextResponse } from "next/server";

import { IngressSource } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { ingressPayloadSchema } from "@/lib/ingress/schemas";

export async function handleIngressRequest(source: IngressSource, request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = ingressPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload must be a valid JSON object" }, { status: 400 });
  }

  try {
    const record = await prisma.ingressEvent.create({
      data: {
        source,
        payload: parsed.data,
      },
    });

    return NextResponse.json(
      {
        id: record.id,
        source: record.source,
        storedAt: record.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`Ingress ${source} persist error`, error);
    return NextResponse.json({ error: "Unable to persist payload" }, { status: 500 });
  }
}
