// src/lib/contracts/customer.ts
import { z } from "zod";

export const CreateCustomerSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]).default("BRONZE"),
  currency: z.string().default("INR"),
});

export const UpdateCustomerSchema = z.object({
  companyName: z.string().min(1).optional(),
  contactName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]).optional(),
  currency: z.string().optional(),
  active: z.boolean().optional(),
});

export const CustomerQuerySchema = z.object({
  search: z.string().optional(),
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]).optional(),
  active: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
export type CustomerQueryInput = z.infer<typeof CustomerQuerySchema>;
