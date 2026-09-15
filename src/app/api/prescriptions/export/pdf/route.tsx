import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { and, inArray, eq, desc } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import JSZip from "jszip";
import { z } from "zod";
import { db } from "@/lib/db/client";
import {
  consultations,
  patients,
  prescriptions,
  optometristProfiles,
  users,
} from "@/lib/db/schema";
import { requireOptometrist } from "@/lib/auth/session";
import { readSignature } from "@/lib/storage/signatures";
import { PrescriptionDocument } from "@/lib/pdf/prescription-document";
import { logAudit } from "@/lib/audit/log";

// react-pdf uses Node built-ins (fs, zlib) internally -- must not run on Edge.
export const runtime = "nodejs";

const bodySchema = z.object({
  patientIds: z.array(z.string().uuid()).min(1).max(500),
});

export async function POST(request: Request) {
  const { appUser } = await requireOptometrist();

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { patientIds } = parsed.data;

  const rows = await db
    .select({
      patientId: patients.id,
      patientName: patients.name,
      patientUid: patients.uidEmpId,
      patientAge: patients.age,
      patientGender: patients.gender,
      consultationDate: consultations.consultationDate,
      optometristId: consultations.optometristId,
      prescription: prescriptions,
    })
    .from(prescriptions)
    .innerJoin(consultations, eq(prescriptions.consultationId, consultations.id))
    .innerJoin(patients, eq(consultations.patientId, patients.id))
    .where(and(eq(patients.createdBy, appUser.id), inArray(patients.id, patientIds)))
    .orderBy(patients.id, desc(consultations.consultationDate));

  // Rows are ordered per-patient by consultation date descending, so the
  // first row seen for a given patientId is their latest prescription.
  const latestByPatient = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestByPatient.has(row.patientId)) {
      latestByPatient.set(row.patientId, row);
    }
  }

  if (latestByPatient.size === 0) {
    return NextResponse.json({ error: "No prescriptions found for the selected clients" }, { status: 404 });
  }

  // Numeric UID ascending, falling back to name for non-numeric/missing UIDs
  // (sorted last) -- matches the order the bulk PDF zip is built in below.
  function uidSortKey(uid: string | null): number {
    return uid && /^\d+$/.test(uid) ? Number(uid) : Number.POSITIVE_INFINITY;
  }
  const sortedRows = [...latestByPatient.values()].sort((a, b) => {
    const diff = uidSortKey(a.patientUid) - uidSortKey(b.patientUid);
    return diff !== 0 ? diff : a.patientName.localeCompare(b.patientName);
  });

  const optometristIds = [...new Set(sortedRows.map((r) => r.optometristId))];
  const optometrists = optometristIds.length
    ? await db
        .select({
          userId: users.id,
          fullName: optometristProfiles.fullName,
          signatureStoragePath: optometristProfiles.signatureStoragePath,
          email: users.email,
        })
        .from(users)
        .leftJoin(optometristProfiles, eq(optometristProfiles.userId, users.id))
        .where(inArray(users.id, optometristIds))
    : [];
  const optometristById = new Map(optometrists.map((o) => [o.userId, o]));

  // Distinct optometrists only -- cheap to resolve up front so each per-row
  // PDF render below has no further async work before it, besides its own
  // rendering.
  const signatureDataUriByOptometrist = new Map<string, string | undefined>();
  await Promise.all(
    optometrists.map(async (optometrist) => {
      if (!optometrist.signatureStoragePath) return;
      const file = await readSignature(optometrist.signatureStoragePath);
      signatureDataUriByOptometrist.set(
        optometrist.userId,
        file ? `data:${file.mimeType};base64,${file.data.toString("base64")}` : undefined,
      );
    }),
  );

  const zip = new JSZip();
  const usedNames = new Set<string>();

  // Each entry's content is a promise that renders the PDF lazily. JSZip
  // resolves these one at a time as it streams the zip below, instead of
  // requiring every PDF to be rendered and held in memory up front -- this
  // is what lets bytes start flowing to the client (and nginx) immediately,
  // rather than only after all 200+ PDFs have finished rendering.
  for (const row of sortedRows) {
    const optometrist = optometristById.get(row.optometristId);
    const signatureDataUri = signatureDataUriByOptometrist.get(row.optometristId);

    const uidPart = row.patientUid ?? row.patientId.slice(0, 8);
    let fileName = `prescription-${uidPart}-${row.consultationDate}-no-logo.pdf`;
    if (usedNames.has(fileName)) {
      fileName = `prescription-${uidPart}-${row.consultationDate}-no-logo-${row.patientId.slice(0, 8)}.pdf`;
    }
    usedNames.add(fileName);

    zip.file(
      fileName,
      renderToBuffer(
        <PrescriptionDocument
          includeLogo={false}
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
      ),
    );
  }

  await logAudit({
    userId: appUser.id,
    action: "prescriptions_bulk_pdf_downloaded",
    entityType: "prescription",
    metadata: { patientCount: latestByPatient.size },
  });

  const today = new Date().toISOString().slice(0, 10);
  const nodeStream = zip.generateNodeStream({ type: "nodebuffer", streamFiles: true });
  const webStream = Readable.toWeb(nodeStream as Readable) as ReadableStream<Uint8Array>;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="prescriptions-bulk-${today}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
