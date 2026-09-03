import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { consultations, patients, prescriptions } from "@/lib/db/schema";
import { requireOptometrist } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/log";
import { buildCsv } from "@/lib/csv/format";
import { formatPowerForPdf, formatAxisForPdf } from "@/lib/pdf/format";

const HEADERS = [
  "Patient Name",
  "UID / Emp Id",
  "Age",
  "Gender",
  "Mobile",
  "Consultation Date",
  "Right Sph",
  "Right Cyl",
  "Right Axis",
  "Right Add",
  "Left Sph",
  "Left Cyl",
  "Left Axis",
  "Left Add",
  "Distance Uncorrected Right",
  "Distance Uncorrected Left",
  "Distance Corrected Right",
  "Distance Corrected Left",
  "Near Uncorrected Right",
  "Near Uncorrected Left",
  "Near Corrected Right",
  "Near Corrected Left",
  "Pinhole Right",
  "Pinhole Left",
  "Color Blindness Result",
  "Optometrist Remarks",
  "Remarks",
];

export async function GET() {
  const { appUser } = await requireOptometrist();

  const rows = await db
    .select({
      patientName: patients.name,
      patientUid: patients.uidEmpId,
      patientAge: patients.age,
      patientGender: patients.gender,
      patientMobile: patients.mobile,
      consultationDate: consultations.consultationDate,
      prescription: prescriptions,
    })
    .from(prescriptions)
    .innerJoin(consultations, eq(prescriptions.consultationId, consultations.id))
    .innerJoin(patients, eq(consultations.patientId, patients.id))
    .orderBy(patients.name, desc(consultations.consultationDate));

  const csv = buildCsv(
    HEADERS,
    rows.map((row) => [
      row.patientName,
      row.patientUid,
      row.patientAge,
      row.patientGender,
      row.patientMobile,
      row.consultationDate,
      formatPowerForPdf(row.prescription.rightSph),
      formatPowerForPdf(row.prescription.rightCyl),
      formatAxisForPdf(row.prescription.rightAxis),
      formatPowerForPdf(row.prescription.rightAdd),
      formatPowerForPdf(row.prescription.leftSph),
      formatPowerForPdf(row.prescription.leftCyl),
      formatAxisForPdf(row.prescription.leftAxis),
      formatPowerForPdf(row.prescription.leftAdd),
      row.prescription.distanceUncorrectedRight,
      row.prescription.distanceUncorrectedLeft,
      row.prescription.distanceCorrectedRight,
      row.prescription.distanceCorrectedLeft,
      row.prescription.nearUncorrectedRight,
      row.prescription.nearUncorrectedLeft,
      row.prescription.nearCorrectedRight,
      row.prescription.nearCorrectedLeft,
      row.prescription.pinholeRight,
      row.prescription.pinholeLeft,
      row.prescription.colorBlindnessResult,
      row.prescription.optometristRemarks,
      row.prescription.remarks,
    ]),
  );

  await logAudit({
    userId: appUser.id,
    action: "prescriptions_csv_exported",
    entityType: "prescription",
    metadata: { rowCount: rows.length },
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
