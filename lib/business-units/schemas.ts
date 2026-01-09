import { z } from "zod";

const addressSchema = z
  .object({
    street: z.string().optional(),
    zip: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    country: z.string().optional(),
  })
  .strict();

const corporateSchema = z
  .object({
    id: z.number(),
    name: z.string().optional(),
  })
  .strict();

const companySchema = z
  .object({
    id: z.number(),
    name: z.string().optional(),
    vatNumber: z.string().optional(),
    fiscalCode: z.string().optional(),
    address: addressSchema.optional(),
  })
  .strict();

const storeSchema = z
  .object({
    id: z.number(),
    name: z.string().optional(),
    address: addressSchema.optional(),
  })
  .strict();

export const businessUnitCreateSchema = z
  .object({
    uniqueKey: z.string().min(1, "uniqueKey is required"),
    instance: z.string().optional(),
    corporate: corporateSchema.optional(),
    company: companySchema.optional(),
    store: storeSchema.optional(),
    metadata: z.any().optional(),
  })
  .strict();

export const businessUnitUpdateSchema = businessUnitCreateSchema.partial({ uniqueKey: true }).extend({
  uniqueKey: z.string().min(1, "uniqueKey is required"),
});

export type BusinessUnitCreateInput = z.infer<typeof businessUnitCreateSchema>;
export type BusinessUnitUpdateInput = z.infer<typeof businessUnitUpdateSchema>;
