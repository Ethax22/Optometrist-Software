import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  qualification: optionalText(200),
  registrationNumber: optionalText(100),
  phone: optionalText(30),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(255)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  clinicName: optionalText(200),
  clinicAddress: optionalText(500),
  city: optionalText(100),
  state: optionalText(100),
  postalCode: optionalText(20),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const MAX_SIGNATURE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const ALLOWED_SIGNATURE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
