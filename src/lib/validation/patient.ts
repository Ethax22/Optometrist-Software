import { z } from "zod";

export const genderOptions = ["Male", "Female", "Other"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

export const patientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  uidEmpId: z.string().trim().min(1, "UID / Emp Id is required").max(100),
  age: z.coerce
    .number({ message: "Age is required" })
    .int("Age must be a whole number")
    .min(1, "Age must be at least 1")
    .max(149, "Age must be under 150"),
  gender: z.enum(genderOptions, { message: "Select a gender" }),
  mobile: optionalText(20),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(255)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  address: optionalText(500),
  consultationDate: z.string().trim().min(1, "Consultation date is required"),
});
export type PatientInput = z.infer<typeof patientSchema>;
