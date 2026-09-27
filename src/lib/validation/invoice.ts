import { z } from "zod";

const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

const positiveDecimal = (message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, message)
    .refine((v) => Number(v) > 0, message);

export const invoiceItemSchema = z.object({
  itemName: requiredText(200, "Item name is required"),
  description: requiredText(1000, "Item description is required"),
  quantity: positiveDecimal("Quantity must be a positive number"),
  unit: requiredText(20, "Unit is required"),
  rate: positiveDecimal("Rate must be a positive number"),
});
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

export const invoiceSchema = z.object({
  invoiceNumber: requiredText(100, "Invoice number is required"),
  invoiceDate: z.string().trim().min(1, "Invoice date is required"),
  paymentTerms: optionalText(100),
  billToName: requiredText(200, "Bill To name is required"),
  billToAddress: optionalText(500),
  shipToName: optionalText(200),
  shipToAddress: optionalText(500),
  placeOfSupply: optionalText(100),
  otherReference: optionalText(200),
  subject: optionalText(300),
  items: z.array(invoiceItemSchema).min(1, "Add at least one item"),
});
export type InvoiceInput = z.infer<typeof invoiceSchema>;
