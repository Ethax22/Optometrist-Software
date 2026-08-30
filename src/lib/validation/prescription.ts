import { z } from "zod";
import { colorBlindnessOptions, optometristRemarksOptions } from "@/lib/constants/clinical";

const optionalDropdown = () =>
  z
    .string()
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
  rightSph: optionalDropdown(),
  rightCyl: optionalDropdown(),
  rightAxis: optionalDropdown(),
  rightAdd: optionalDropdown(),

  leftSph: optionalDropdown(),
  leftCyl: optionalDropdown(),
  leftAxis: optionalDropdown(),
  leftAdd: optionalDropdown(),

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

  optometristRemarks: z
    .enum(optometristRemarksOptions)
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
