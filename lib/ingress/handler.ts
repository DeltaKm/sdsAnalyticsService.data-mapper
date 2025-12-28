import { NextRequest, NextResponse } from "next/server";

import { IngressSource } from "@/app/generated/prisma/enums";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ingressPayloadSchema } from "@/lib/ingress/schemas";

async function persistPayload(source: IngressSource, payload: Prisma.InputJsonValue) {
  const record = await prisma.ingressEvent.create({
    data: {
      source,
      payload,
    },
  });

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
