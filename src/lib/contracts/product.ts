import { z } from "zod";

export const ProductQuerySchema = z.object({
  priceListId: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
});

export type ProductQueryInput = z.infer<typeof ProductQuerySchema>;
