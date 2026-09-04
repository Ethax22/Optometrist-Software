import { z } from "zod";
import { colorBlindnessOptions, colorBlindnessScoreOptions } from "@/lib/constants/clinical";

const optionalDropdown = () =>
  z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

const optionalPower = () =>
  z
    .string()
    .regex(/^[+-]\d+(\.\d+)?$/, "Must be a signed number, e.g. +2.25 or -0.50")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

const optionalAxis = () =>
  z
    .string()
    .regex(/^\d+$/, "Axis must be a whole number")
    .refine((v) => Number(v) >= 0 && Number(v) <= 180, "Axis must be between 0 and 180")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

/**
 * Every clinical field is optional -- a partial exam (screening cut short,
 * a field genuinely not applicable) must still be saveable. Numeric fields
 * (sph/cyl/axis/add) stay as plain strings here, matching what the Select
 * controls actually produce; the server action converts them to numbers
 * (or null) right before the DB write.
 */
export const prescriptionSchema = z.object({
  rightSph: optionalPower(),
  rightCyl: optionalPower(),
  rightAxis: optionalAxis(),
  rightAdd: optionalPower(),

  leftSph: optionalPower(),
  leftCyl: optionalPower(),
  leftAxis: optionalAxis(),
  leftAdd: optionalPower(),

  distanceUncorrectedRight: optionalDropdown(),
  distanceUncorrectedLeft: optionalDropdown(),
  distanceCorrectedRight: optionalDropdown(),
  distanceCorrectedLeft: optionalDropdown(),

  nearUncorrectedRight: optionalDropdown(),
  nearUncorrectedLeft: optionalDropdown(),
  nearCorrectedRight: optionalDropdown(),
  nearCorrectedLeft: optionalDropdown(),

  pinholeRight: optionalDropdown(),
  pinholeLeft: optionalDropdown(),

  colorBlindnessResult: z.enum(colorBlindnessOptions).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),

  colorBlindnessRe: z
    .enum(colorBlindnessScoreOptions as [string, ...string[]])
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),

  colorBlindnessLe: z
    .enum(colorBlindnessScoreOptions as [string, ...string[]])
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),

  optometristRemarks: z
    .string()
    .trim()
    .max(500, "Optometrist remarks must be under 500 characters")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),

  remarks: z
    .string()
    .trim()
    .max(2000, "Remarks must be under 2000 characters")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});
export type PrescriptionInput = z.infer<typeof prescriptionSchema>;
