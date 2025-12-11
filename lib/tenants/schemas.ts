import { z } from "zod";

const metadataSchema = z.record(z.any()).optional();

export const tenantCreateSchema = z.object({
  tenantId: z.string().min(1, "tenantId is required"),
  name: z.string().min(1, "name is required"),
  metadata: metadataSchema,
});

export const tenantUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  metadata: metadataSchema,
});

export type TenantCreateInput = z.infer<typeof tenantCreateSchema>;
export type TenantUpdateInput = z.infer<typeof tenantUpdateSchema>;
