import { z } from "zod";

export const CounterOfferSchema = z.object({
  requestedDiscountPct: z
    .number()
    .min(0)
    .max(100, "Discount cannot exceed 100%"),
  message: z.string().max(500).optional(),
});

export type CounterOfferInput = z.infer<typeof CounterOfferSchema>;
