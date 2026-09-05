import { z } from "zod";

export const ProductQuerySchema = z.object({
  priceListId: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
});

export type ProductQueryInput = z.infer<typeof ProductQuerySchema>;

export const CreateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(64),
  description: z.string().max(255).optional().default(""),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
