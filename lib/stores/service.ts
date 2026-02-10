// @ts-nocheck
import { prisma } from "@/lib/prisma";
import type { StoreCreateInput, StoreUpdateInput } from "@/lib/stores/schemas";
import type { Prisma } from "@/app/generated/prisma/client";

class StoreExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreExistsError";
  }
}

class StoreNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreNotFoundError";
  }
}

class TenantMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantMissingError";
  }
}

function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined,
): Prisma.InputJsonValue | null | undefined {
  if (!metadata) {
    return undefined;
  }
  if (Object.keys(metadata).length === 0) {
    return undefined;
  }
  return metadata as Prisma.InputJsonValue;
}

async function upsertGroup(group: StoreCreateInput["group"]) {
  return prisma.storeGroup.upsert({
    where: { groupId: group.id },
    update: {
      name: group.name ?? undefined,
      supervisorId: group.supervisorId,
      metadata: sanitizeMetadata(group.metadata),
    },
    create: {
      groupId: group.id,
      name: group.name ?? group.id,
      supervisorId: group.supervisorId,
      metadata: sanitizeMetadata(group.metadata),
    },
  });
}

async function upsertSubgroup(groupId: string, subgroup?: StoreCreateInput["subgroup"]) {
  if (!subgroup) {
    return null;
  }

  return prisma.storeSubgroup.upsert({
    where: { subgroupId: subgroup.id },
    update: {
      name: subgroup.name ?? undefined,
      metadata: sanitizeMetadata(subgroup.metadata),
      groupId,
    },
    create: {
      subgroupId: subgroup.id,
      groupId,
      name: subgroup.name ?? subgroup.id,
      metadata: sanitizeMetadata(subgroup.metadata),
    },
  });
}

export async function createStore(input: StoreCreateInput) {
  const { tenantId, storeId, name, status, metadata, group, subgroup } = input;

  const existing = await prisma.store.findUnique({
    where: {
      tenantId_storeId: { tenantId, storeId },
    },
  });

  if (existing) {
    throw new StoreExistsError(`Store ${storeId} already exists for tenant ${tenantId}`);
  }

  const tenant = await prisma.tenant.findUnique({ where: { tenantId } });
  if (!tenant) {
    throw new TenantMissingError(`Tenant ${tenantId} does not exist. Create it before adding activities.`);
  }

  const groupRecord = await upsertGroup(group);
  const subgroupRecord = await upsertSubgroup(groupRecord.groupId, subgroup);

  return prisma.store.create({
    data: {
      tenantId,
      storeId,
      name,
      status: status ?? "active",
      metadata: sanitizeMetadata(metadata),
      groupId: groupRecord.groupId,
      subgroupId: subgroupRecord?.subgroupId,
    },
  });
}

export async function updateStore(storeId: string, input: StoreUpdateInput) {
  const { tenantId, name, status, metadata, group, subgroup } = input;

  const store = await prisma.store.findUnique({
    where: { tenantId_storeId: { tenantId, storeId } },
  });

  if (!store) {
    throw new StoreNotFoundError(`Store ${storeId} not found for tenant ${tenantId}`);
  }

  let groupId = store.groupId;
  if (group) {
    const groupRecord = await upsertGroup({ ...group });
    groupId = groupRecord.groupId;
  }

  let subgroupId = store.subgroupId;
  if (subgroup) {
    if (!groupId) {
      throw new Error("Cannot set subgroup without a group");
    }
    const subgroupRecord = await upsertSubgroup(groupId, subgroup);
    subgroupId = subgroupRecord?.subgroupId ?? null;
  }

  return prisma.store.update({
    where: { tenantId_storeId: { tenantId, storeId } },
    data: {
      name: name ?? undefined,
      status: status ?? undefined,
      metadata: sanitizeMetadata(metadata),
      groupId,
      subgroupId,
    },
  });
}

export { StoreExistsError, StoreNotFoundError, TenantMissingError };
