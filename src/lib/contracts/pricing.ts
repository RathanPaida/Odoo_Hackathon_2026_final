import { z } from "zod";

export const PricingPreviewLineSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive(),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a decimal string"),
  discountPct: z.number().min(0).max(100).default(0),
  unitCost: z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a decimal string"),
  billingType: z.enum(["ONE_TIME", "RECURRING"]),
  subscriptionMonths: z.number().int().positive().optional(),
});

export const PricingPreviewSchema = z.object({
  lines: z.array(PricingPreviewLineSchema).min(1),
});

export type PricingPreviewInput = z.infer<typeof PricingPreviewSchema>;
export type PricingPreviewLine = z.infer<typeof PricingPreviewLineSchema>;
