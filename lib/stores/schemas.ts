import { z } from "zod";

const metadataSchema = z.record(z.any()).optional();

export const groupSchema = z.object({
  id: z.string().min(1, "group.id is required"),
  name: z.string().min(1).optional(),
  supervisorId: z.string().optional(),
  metadata: metadataSchema,
});

export const subgroupSchema = z.object({
  id: z.string().min(1, "subgroup.id is required"),
  name: z.string().min(1).optional(),
  metadata: metadataSchema,
});

export const storeCreateSchema = z.object({
  tenantId: z.string().min(1, "tenantId is required"),
  storeId: z.string().min(1, "storeId is required"),
  name: z.string().min(1).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  metadata: metadataSchema,
  group: groupSchema,
  subgroup: subgroupSchema.optional(),
});

export const storeUpdateSchema = z.object({
  tenantId: z.string().min(1, "tenantId is required"),
  name: z.string().min(1).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  metadata: metadataSchema,
  group: groupSchema.optional(),
  subgroup: subgroupSchema.optional(),
});

export type StoreCreateInput = z.infer<typeof storeCreateSchema>;
export type StoreUpdateInput = z.infer<typeof storeUpdateSchema>;
