import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db/client";
import { consultations, patients, prescriptions, optometristProfiles, users } from "@/lib/db/schema";
import { requireOptometrist } from "@/lib/auth/session";
import { readSignature } from "@/lib/storage/signatures";
import { PrescriptionDocument } from "@/lib/pdf/prescription-document";
import { logAudit } from "@/lib/audit/log";

// react-pdf uses Node built-ins (fs, zlib) internally -- must not run on Edge.
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ consultationId: string }> },
) {
  const { appUser } = await requireOptometrist();

  const { consultationId } = await params;
  const includeLogo = new URL(request.url).searchParams.get("logo") !== "false";

  const [row] = await db
    .select({
      consultationDate: consultations.consultationDate,
      optometristId: consultations.optometristId,
      patientName: patients.name,
      patientUid: patients.uidEmpId,
      patientAge: patients.age,
      patientGender: patients.gender,
      prescription: prescriptions,
    })
    .from(consultations)
    .innerJoin(patients, eq(consultations.patientId, patients.id))
    .leftJoin(prescriptions, eq(prescriptions.consultationId, consultations.id))
    .where(eq(consultations.id, consultationId))
    .limit(1);

  if (!row || !row.prescription) {
    return NextResponse.json({ error: "No saved prescription for this consultation" }, { status: 404 });
  }

  const [optometrist] = await db
    .select({
      fullName: optometristProfiles.fullName,
      signatureStoragePath: optometristProfiles.signatureStoragePath,
      email: users.email,
    })
    .from(users)
    .leftJoin(optometristProfiles, eq(optometristProfiles.userId, users.id))
    .where(eq(users.id, row.optometristId))
    .limit(1);

  let signatureDataUri: string | undefined;
  if (optometrist?.signatureStoragePath) {
    const file = await readSignature(optometrist.signatureStoragePath);
    if (file) {
      signatureDataUri = `data:${file.mimeType};base64,${file.data.toString("base64")}`;
    }
  }

  const buffer = await renderToBuffer(
    <PrescriptionDocument
      includeLogo={includeLogo}
      data={{
        patientName: row.patientName,
        patientUid: row.patientUid,
        patientAge: row.patientAge,
        patientGender: row.patientGender,
        consultationDate: row.consultationDate,
        optometristName: optometrist?.fullName || optometrist?.email || "Optometrist",
        signatureDataUri,
        rightSph: row.prescription.rightSph,
        rightCyl: row.prescription.rightCyl,
        rightAxis: row.prescription.rightAxis,
        rightAdd: row.prescription.rightAdd,
        leftSph: row.prescription.leftSph,
        leftCyl: row.prescription.leftCyl,
        leftAxis: row.prescription.leftAxis,
        leftAdd: row.prescription.leftAdd,
        distanceUncorrectedRight: row.prescription.distanceUncorrectedRight,
        distanceUncorrectedLeft: row.prescription.distanceUncorrectedLeft,
        distanceCorrectedRight: row.prescription.distanceCorrectedRight,
        distanceCorrectedLeft: row.prescription.distanceCorrectedLeft,
        nearUncorrectedRight: row.prescription.nearUncorrectedRight,
        nearUncorrectedLeft: row.prescription.nearUncorrectedLeft,
        nearCorrectedRight: row.prescription.nearCorrectedRight,
        nearCorrectedLeft: row.prescription.nearCorrectedLeft,
        pinholeRight: row.prescription.pinholeRight,
        pinholeLeft: row.prescription.pinholeLeft,
        colorBlindnessResult: row.prescription.colorBlindnessResult,
        colorBlindnessRe: row.prescription.colorBlindnessRe,
        colorBlindnessLe: row.prescription.colorBlindnessLe,
        optometristRemarks: row.prescription.optometristRemarks,
        remarks: row.prescription.remarks,
      }}
    />,
  );

  await logAudit({
    userId: appUser.id,
    action: "prescription_pdf_downloaded",
    entityType: "consultation",
    entityId: consultationId,
    metadata: { examOptometristId: row.optometristId },
  });

  const suffix = includeLogo ? "" : "-no-logo";
  const uidPart = row.patientUid ?? consultationId.slice(0, 8);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="prescription-${uidPart}-${row.consultationDate}${suffix}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
