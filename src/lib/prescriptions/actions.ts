"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { prescriptions, consultations } from "@/lib/db/schema";
import { requireOptometrist } from "@/lib/auth/session";
import { prescriptionSchema, type PrescriptionInput } from "@/lib/validation/prescription";
import { logAudit } from "@/lib/audit/log";

export type ActionResult = { error: string } | { success: true; downloadPdf?: boolean };

/** Postgres numeric() accepts a leading '+' or '-' directly, so sph/cyl/add
 * dropdown strings (e.g. "+2.25") pass straight through -- only axis
 * (a smallint column) needs converting to an actual integer. */
function toIntOrNull(value?: string): number | null {
  return value === undefined || value === "" ? null : parseInt(value, 10);
}

function toNumericOrNull(value?: string): string | null {
  return value === undefined || value === "" ? null : value;
}

function toTextOrNull(value?: string): string | null {
  return value === undefined || value === "" ? null : value;
}

async function persistPrescription(consultationId: string, data: PrescriptionInput, userId: string) {
  const [row] = await db
    .select({ id: consultations.id })
    .from(consultations)
    .where(eq(consultations.id, consultationId))
    .limit(1);

  if (!row) {
    throw new Error("Consultation not found");
  }

  const values = {
    consultationId,
    rightSph: toNumericOrNull(data.rightSph),
    rightCyl: toNumericOrNull(data.rightCyl),
    rightAxis: toIntOrNull(data.rightAxis),
    rightAdd: toNumericOrNull(data.rightAdd),
    leftSph: toNumericOrNull(data.leftSph),
    leftCyl: toNumericOrNull(data.leftCyl),
    leftAxis: toIntOrNull(data.leftAxis),
    leftAdd: toNumericOrNull(data.leftAdd),
    distanceUncorrectedRight: toTextOrNull(data.distanceUncorrectedRight),
    distanceUncorrectedLeft: toTextOrNull(data.distanceUncorrectedLeft),
    distanceCorrectedRight: toTextOrNull(data.distanceCorrectedRight),
    distanceCorrectedLeft: toTextOrNull(data.distanceCorrectedLeft),
    nearUncorrectedRight: toTextOrNull(data.nearUncorrectedRight),
    nearUncorrectedLeft: toTextOrNull(data.nearUncorrectedLeft),
    nearCorrectedRight: toTextOrNull(data.nearCorrectedRight),
    nearCorrectedLeft: toTextOrNull(data.nearCorrectedLeft),
    pinholeRight: toTextOrNull(data.pinholeRight),
    pinholeLeft: toTextOrNull(data.pinholeLeft),
    colorBlindnessResult: toTextOrNull(data.colorBlindnessResult),
    remarks: toTextOrNull(data.remarks),
    updatedAt: new Date(),
  };

  await db
    .insert(prescriptions)
    .values(values)
    .onConflictDoUpdate({ target: prescriptions.consultationId, set: values });

  await logAudit({
    userId,
    action: "prescription_saved",
    entityType: "prescription",
    entityId: consultationId,
  });
}

export async function saveExaminationAction(
  _prev: ActionResult | null,
  input: { consultationId: string } & PrescriptionInput,
): Promise<ActionResult> {
  const { appUser } = await requireOptometrist();

  const { consultationId, ...rest } = input;
  const parsed = prescriptionSchema.safeParse(rest);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await persistPrescription(consultationId, parsed.data, appUser.id);
  return { success: true };
}

export async function saveAndGeneratePdfAction(
  _prev: ActionResult | null,
  input: { consultationId: string } & PrescriptionInput,
): Promise<ActionResult> {
  const { appUser } = await requireOptometrist();

  const { consultationId, ...rest } = input;
  const parsed = prescriptionSchema.safeParse(rest);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await persistPrescription(consultationId, parsed.data, appUser.id);

  // The actual PDF bytes come from GET /api/prescriptions/[id]/pdf --
  // Server Actions return serializable data, not a file stream, so the
  // client triggers that download itself once this reports success.
  return { success: true, downloadPdf: true };
}
