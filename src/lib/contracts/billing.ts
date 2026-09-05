import { z } from "zod";

export const InvoiceStatusSchema = z.enum(["DRAFT", "ISSUED", "PAID", "PARTIALLY_PAID", "OVERDUE", "CANCELLED"]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const PaymentStatusSchema = z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const InvoiceTypeSchema = z.enum(["ONE_TIME", "RECURRING", "PRORATION", "CREDIT"]);
export type InvoiceType = z.infer<typeof InvoiceTypeSchema>;

export const CreateInvoiceSchema = z.object({
  quoteId: z.string().min(1),
  invoiceType: InvoiceTypeSchema.default("ONE_TIME"),
  dueDays: z.number().int().positive().default(30),
  startDate: z.string().datetime().optional(),
});

export const RecordPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a decimal string"),
  paymentMethod: z.string().min(1),
  transactionReference: z.string().optional(),
});

export const CancelInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  reason: z.string().optional(),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;
