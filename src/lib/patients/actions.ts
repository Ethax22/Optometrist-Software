"use server";

import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { patients, consultations } from "@/lib/db/schema";
import { requireOptometrist } from "@/lib/auth/session";
import { patientSchema, type PatientInput } from "@/lib/validation/patient";
import { logAudit } from "@/lib/audit/log";

export type ActionResult =
  | { error: string; existingPatientId?: string }
  | { success: true };

/** Postgres error code for a unique-constraint violation. */
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === UNIQUE_VIOLATION;
}

/**
 * Registers a brand-new patient and opens their first consultation.
 * This always creates a new patient row -- adding a further visit for an
 * existing patient happens from Search (find patient -> new visit), not
 * from this form, matching the reference workflow.
 */
export async function registerPatientAction(
  _prev: ActionResult | null,
  input: PatientInput,
): Promise<ActionResult> {
  const { appUser } = await requireOptometrist();

  const parsed = patientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { consultationDate, ...patientData } = parsed.data;

  const [existing] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(sql`lower(${patients.uidEmpId}) = lower(${patientData.uidEmpId})`)
    .limit(1);

  if (existing) {
    return {
      error:
        "A patient with this UID / Emp Id already exists. Use Search to find them and start a new visit instead.",
      existingPatientId: existing.id,
    };
  }

  let created: { patientId: string; consultationId: string };
  try {
    created = await db.transaction(async (tx) => {
      const [patient] = await tx
        .insert(patients)
        .values({
          ...patientData,
          createdBy: appUser.id,
          updatedBy: appUser.id,
        })
        .returning({ id: patients.id });

      const [consultation] = await tx
        .insert(consultations)
        .values({
          patientId: patient.id,
          optometristId: appUser.id,
          consultationDate,
          createdBy: appUser.id,
          updatedBy: appUser.id,
        })
        .returning({ id: consultations.id });

      return { patientId: patient.id, consultationId: consultation.id };
    });
  } catch (err) {
    // Fallback for the rare race where two submissions for the same UID
    // land concurrently and both pass the check above -- the DB's unique
    // index is the actual guarantee, this just turns it into the same
    // friendly message instead of a raw constraint-violation error.
    if (isUniqueViolation(err)) {
      const [race] = await db
        .select({ id: patients.id })
        .from(patients)
        .where(sql`lower(${patients.uidEmpId}) = lower(${patientData.uidEmpId})`)
        .limit(1);
      return {
        error:
          "A patient with this UID / Emp Id already exists. Use Search to find them and start a new visit instead.",
        existingPatientId: race?.id,
      };
    }
    throw err;
  }

  await logAudit({
    userId: appUser.id,
    action: "patient_registered",
    entityType: "patient",
    entityId: created.patientId,
  });
  await logAudit({
    userId: appUser.id,
    action: "consultation_created",
    entityType: "consultation",
    entityId: created.consultationId,
    metadata: { patientId: created.patientId },
  });

  redirect(`/examination/${created.consultationId}`);
}

/**
 * Opens a new consultation for a patient who already exists -- the
 * counterpart to registerPatientAction, reached from the patient's page
 * (Search -> existing patient -> New Visit) rather than Registration.
 */
export async function startNewVisitAction(
  _prev: ActionResult | null,
  input: { patientId: string; consultationDate: string },
): Promise<ActionResult> {
  const { appUser } = await requireOptometrist();

  if (!input.consultationDate) {
    return { error: "Consultation date is required" };
  }

  const [consultation] = await db
    .insert(consultations)
    .values({
      patientId: input.patientId,
      optometristId: appUser.id,
      consultationDate: input.consultationDate,
      createdBy: appUser.id,
      updatedBy: appUser.id,
    })
    .returning({ id: consultations.id });

  await logAudit({
    userId: appUser.id,
    action: "consultation_created",
    entityType: "consultation",
    entityId: consultation.id,
    metadata: { patientId: input.patientId },
  });

  redirect(`/examination/${consultation.id}`);
}
