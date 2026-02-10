// @ts-nocheck
import { prisma } from "@/lib/prisma";
import type { TenantCreateInput, TenantUpdateInput } from "@/lib/tenants/schemas";
import type { Prisma } from "@/app/generated/prisma/client";

class TenantExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantExistsError";
  }
}

class TenantNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantNotFoundError";
  }
}

function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Prisma.InputJsonValue | null | undefined {
  if (!metadata || Object.keys(metadata).length === 0) {
    return undefined;
  }
  return metadata as Prisma.InputJsonValue;
}

export async function createTenant(input: TenantCreateInput) {
  const { tenantId, name, metadata } = input;

  const existing = await prisma.tenant.findUnique({ where: { tenantId } });
  if (existing) {
    throw new TenantExistsError(`Tenant ${tenantId} already exists`);
  }

  return prisma.tenant.create({
    data: {
      tenantId,
      name,
      metadata: sanitizeMetadata(metadata),
    },
  });
}

export async function updateTenant(tenantId: string, input: TenantUpdateInput) {
  const { name, metadata } = input;

  const existing = await prisma.tenant.findUnique({ where: { tenantId } });
  if (!existing) {
    throw new TenantNotFoundError(`Tenant ${tenantId} not found`);
  }

  return prisma.tenant.update({
    where: { tenantId },
    data: {
      name: name ?? undefined,
      metadata: sanitizeMetadata(metadata),
    },
  });
}

export { TenantExistsError, TenantNotFoundError };
