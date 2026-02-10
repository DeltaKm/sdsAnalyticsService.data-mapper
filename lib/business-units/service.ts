// @ts-nocheck
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import type { BusinessUnitCreateInput, BusinessUnitUpdateInput } from "./schemas";

class BusinessUnitExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessUnitExistsError";
  }
}

class BusinessUnitNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessUnitNotFoundError";
  }
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}

export async function createBusinessUnit(input: BusinessUnitCreateInput) {
  const { uniqueKey, instance, corporate, company, store, metadata } = input;

  const existing = await prisma.businessUnit.findUnique({ where: { uniqueKey } });
  if (existing) {
    throw new BusinessUnitExistsError(`Business unit ${uniqueKey} already exists`);
  }

  return prisma.businessUnit.create({
    data: {
      uniqueKey,
      instance,
      corporate: toJson(corporate),
      company: toJson(company),
      store: toJson(store),
      metadata: toJson(metadata),
    },
  });
}

export async function updateBusinessUnit(uniqueKey: string, input: BusinessUnitUpdateInput) {
  const { instance, corporate, company, store, metadata } = input;

  const existing = await prisma.businessUnit.findUnique({ where: { uniqueKey } });
  if (!existing) {
    throw new BusinessUnitNotFoundError(`Business unit ${uniqueKey} not found`);
  }

  return prisma.businessUnit.update({
    where: { uniqueKey },
    data: {
      instance: instance ?? existing.instance,
      corporate: toJson(corporate) ?? existing.corporate,
      company: toJson(company) ?? existing.company,
      store: toJson(store) ?? existing.store,
      metadata: toJson(metadata) ?? existing.metadata,
    },
  });
}

export async function getBusinessUnit(uniqueKey: string) {
  const existing = await prisma.businessUnit.findUnique({ where: { uniqueKey } });
  if (!existing) {
    throw new BusinessUnitNotFoundError(`Business unit ${uniqueKey} not found`);
  }
  return existing;
}

export { BusinessUnitExistsError, BusinessUnitNotFoundError };
