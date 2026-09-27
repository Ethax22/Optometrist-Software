import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db/client";
import { invoices, invoiceItems, optometristProfiles, users } from "@/lib/db/schema";
import { requireOptometrist } from "@/lib/auth/session";
import { readSignature } from "@/lib/storage/signatures";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import { logAudit } from "@/lib/audit/log";

// react-pdf uses Node built-ins (fs, zlib) internally -- must not run on Edge.
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { appUser } = await requireOptometrist();
  const { invoiceId } = await params;

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.createdBy, appUser.id)))
    .limit(1);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .orderBy(asc(invoiceItems.sortOrder));

  const [optometrist] = await db
    .select({
      fullName: optometristProfiles.fullName,
      signatureStoragePath: optometristProfiles.signatureStoragePath,
      userEmail: users.email,
    })
    .from(users)
    .leftJoin(optometristProfiles, eq(optometristProfiles.userId, users.id))
    .where(eq(users.id, appUser.id))
    .limit(1);

  let signatureDataUri: string | undefined;
  if (optometrist?.signatureStoragePath) {
    const file = await readSignature(optometrist.signatureStoragePath);
    if (file) {
      signatureDataUri = `data:${file.mimeType};base64,${file.data.toString("base64")}`;
    }
  }

  const buffer = await renderToBuffer(
    <InvoiceDocument
      data={{
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        paymentTerms: invoice.paymentTerms,
        otherReference: invoice.otherReference,
        placeOfSupply: invoice.placeOfSupply,
        subject: invoice.subject,
        billToName: invoice.billToName,
        billToAddress: invoice.billToAddress,
        shipToName: invoice.shipToName,
        shipToAddress: invoice.shipToAddress,
        items: items.map((item) => ({
          itemName: item.itemName,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
        })),
        totalAmount: invoice.totalAmount,
        optometristName: optometrist?.fullName || optometrist?.userEmail || "Optometrist",
        signatureDataUri,
      }}
    />,
  );

  await logAudit({
    userId: appUser.id,
    action: "invoice_pdf_downloaded",
    entityType: "invoice",
    entityId: invoiceId,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
