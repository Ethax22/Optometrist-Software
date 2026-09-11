import { NextResponse } from "next/server";
import { and, eq, desc, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { consultations, patients, prescriptions } from "@/lib/db/schema";
import { requireOptometrist } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/log";
import { buildCsv } from "@/lib/csv/format";

const HEADERS = [
  "#",
  "Name",
  "Gender",
  "Age",
  "MRN",
  "Color Blindness RE",
  "Color Blindness LE",
  "Color Blindness Result",
  "Optometrist Remarks",
  "Remarks",
];

const bodySchema = z.object({
  patientIds: z.array(z.string().uuid()).min(1).max(500),
});

async function buildPrescriptionsCsv(userId: string, patientIds: string[] | null) {
  const rows = await db
    .select({
      patientName: patients.name,
      patientUid: patients.uidEmpId,
      patientAge: patients.age,
      patientGender: patients.gender,
      prescription: prescriptions,
    })
    .from(prescriptions)
    .innerJoin(consultations, eq(prescriptions.consultationId, consultations.id))
    .innerJoin(patients, eq(consultations.patientId, patients.id))
    .where(
      and(
        eq(patients.createdBy, userId),
        patientIds ? inArray(patients.id, patientIds) : undefined,
      ),
    )
    // Numeric UID ascending (falls back to name, then latest visit first for
    // patients sharing a UID/name) -- a plain text sort would put "85090"
    // after "9" once digit counts differ, which isn't what "sorted by UID"
    // means for all-numeric UIDs like this clinic uses. Non-numeric/missing
    // UIDs sort last (Postgres' default NULLS LAST for ASC).
    .orderBy(
      sql`CASE WHEN ${patients.uidEmpId} ~ '^[0-9]+$' THEN ${patients.uidEmpId}::bigint END`,
      patients.name,
      desc(consultations.consultationDate),
    );

  const csv = buildCsv(
    HEADERS,
    rows.map((row, index) => [
      index + 1,
      row.patientName,
      row.patientGender,
      row.patientAge,
      row.patientUid,
      row.prescription.colorBlindnessRe,
      row.prescription.colorBlindnessLe,
      row.prescription.colorBlindnessResult,
      row.prescription.optometristRemarks,
      row.prescription.remarks,
    ]),
  );

  await logAudit({
    userId,
    action: "prescriptions_csv_exported",
    entityType: "prescription",
    metadata: { rowCount: rows.length, selected: patientIds !== null },
  });

  const today = new Date().toISOString().slice(0, 10);
  // Leading BOM so Excel opens the UTF-8 file without mangling non-ASCII names.
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prescriptions-export-${today}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET() {
  const { appUser } = await requireOptometrist();
  return buildPrescriptionsCsv(appUser.id, null);
}

export async function POST(request: Request) {
  const { appUser } = await requireOptometrist();

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  return buildPrescriptionsCsv(appUser.id, parsed.data.patientIds);
}
