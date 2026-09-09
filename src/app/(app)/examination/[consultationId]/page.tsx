import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { consultations, patients, prescriptions } from "@/lib/db/schema";
import { requireOptometrist } from "@/lib/auth/session";
import { ExaminationForm } from "./examination-form";

export default async function ExaminationPage({
  params,
}: {
  params: Promise<{ consultationId: string }>;
}) {
  const { appUser } = await requireOptometrist();
  const { consultationId } = await params;

  const [row] = await db
    .select({
      consultationDate: consultations.consultationDate,
      patientName: patients.name,
      patientUid: patients.uidEmpId,
      patientAge: patients.age,
      patientGender: patients.gender,
    })
    .from(consultations)
    .innerJoin(patients, eq(consultations.patientId, patients.id))
    .where(and(eq(consultations.id, consultationId), eq(patients.createdBy, appUser.id)))
    .limit(1);

  if (!row) {
    notFound();
  }

  const [existingPrescription] = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.consultationId, consultationId))
    .limit(1);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Examination</h1>
        <p className="text-muted-foreground">
          {row.patientName} &middot; UID {row.patientUid ?? "-"} &middot; {row.patientAge} /{" "}
          {row.patientGender} &middot; {row.consultationDate}
        </p>
      </div>

      <ExaminationForm consultationId={consultationId} prescription={existingPrescription ?? null} />
    </div>
  );
}
