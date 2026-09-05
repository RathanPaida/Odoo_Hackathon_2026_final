import { z } from "zod";

export const CreateQuoteSchema = z.object({
  customerId: z.string().min(1),
  priceListId: z.string().min(1).optional(),
});

export const AddQuoteLineSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive(),
  discountPct: z.number().min(0).max(100).default(0),
  subscriptionMonths: z.number().int().positive().optional(),
});

export const RemoveQuoteLineSchema = z.object({
  lineId: z.string().min(1),
});

export const SubmitQuoteSchema = z.object({}).optional();

export const ApproveQuoteSchema = z.object({
  reason: z.string().optional(),
});

export const RejectQuoteSchema = z.object({
  reason: z.string().min(1, "Reason is required for rejection"),
});

export const AllocateQuoteSchema = z.object({
  // Allocation is driven server-side; no body required
});

export const ConfirmQuoteSchema = z.object({
  startDate: z.string().datetime().optional(), // ISO date for subscription start
  dueDays: z.number().int().positive().default(30),
});

export type CreateQuoteInput = z.infer<typeof CreateQuoteSchema>;
export type AddQuoteLineInput = z.infer<typeof AddQuoteLineSchema>;
export type ApproveQuoteInput = z.infer<typeof ApproveQuoteSchema>;
export type RejectQuoteInput = z.infer<typeof RejectQuoteSchema>;
export type ConfirmQuoteInput = z.infer<typeof ConfirmQuoteSchema>;
