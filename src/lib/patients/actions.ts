"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { patients, consultations } from "@/lib/db/schema";
import { requireOptometrist } from "@/lib/auth/session";
import { patientSchema, type PatientInput } from "@/lib/validation/patient";

export type ActionResult = { error: string } | { success: true };

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

  const consultationId = await db.transaction(async (tx) => {
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

    return consultation.id;
  });

  redirect(`/examination/${consultationId}`);
}
