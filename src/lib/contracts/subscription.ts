import { z } from "zod";

export const BillingCycleSchema = z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]);
export type BillingCycle = z.infer<typeof BillingCycleSchema>;

export const SubscriptionStatusSchema = z.enum(["ACTIVE", "PAST_DUE", "PAUSED", "CANCELLED", "EXPIRED"]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionPlanSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  billingCycle: BillingCycleSchema,
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a decimal string"),
  prorationEnabled: z.boolean().default(true),
  cancellationPolicy: z.string().optional(),
  refundPolicy: z.string().optional(),
  active: z.boolean().default(true),
});

export const CreateSubscriptionSchema = z.object({
  customerId: z.string().min(1),
  orderId: z.string().min(1),
  orderLineId: z.string().min(1),
  productId: z.string().min(1),
  planId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  startDate: z.string().datetime(),
  autoPayEnabled: z.boolean().default(false),
});

export const UpdateSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1),
  quantity: z.number().int().positive().optional(),
  planId: z.string().optional(),
  autoPayEnabled: z.boolean().optional(),
  status: SubscriptionStatusSchema.optional(),
});

export const CancelSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1),
  reason: z.string().optional(),
  immediate: z.boolean().default(false),
});

export type SubscriptionPlanInput = z.infer<typeof SubscriptionPlanSchema>;
export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionSchema>;
