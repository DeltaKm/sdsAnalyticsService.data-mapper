import { z } from "zod";

export const ingressPayloadSchema = z
  .object({})
  .passthrough()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Payload cannot be empty",
  });

export type IngressPayload = z.infer<typeof ingressPayloadSchema>;
