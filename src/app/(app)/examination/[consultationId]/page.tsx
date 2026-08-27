import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { consultations, patients } from "@/lib/db/schema";

export default async function ExaminationPage({
  params,
}: {
  params: Promise<{ consultationId: string }>;
}) {
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
    .where(eq(consultations.id, consultationId))
    .limit(1);

  if (!row) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-2 p-6">
      <h1 className="text-2xl font-semibold">Examination</h1>
      <p className="text-muted-foreground">
        {row.patientName} &middot; UID {row.patientUid} &middot; {row.patientAge} /{" "}
        {row.patientGender} &middot; {row.consultationDate}
      </p>
      <p className="text-sm text-muted-foreground">
        The refraction, visual acuity, and remarks form is coming in the next phase.
      </p>
    </div>
  );
}
