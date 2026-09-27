"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invoices, invoiceItems } from "@/lib/db/schema";
import { requireOptometrist } from "@/lib/auth/session";
import { invoiceSchema, type InvoiceInput } from "@/lib/validation/invoice";
import { logAudit } from "@/lib/audit/log";

export type ActionResult = { error: string } | { success: true; invoiceId: string };

/** Postgres error code for a unique-constraint violation. */
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === UNIQUE_VIOLATION;
}

function computeItemAmount(quantity: string, rate: string): string {
  return (Number(quantity) * Number(rate)).toFixed(2);
}

export async function createInvoiceAction(
  _prev: ActionResult | null,
  input: InvoiceInput,
): Promise<ActionResult> {
  const { appUser } = await requireOptometrist();

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const itemsWithAmounts = data.items.map((item) => ({
    itemName: item.itemName,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    amount: computeItemAmount(item.quantity, item.rate),
  }));
  const totalAmount = itemsWithAmounts
    .reduce((sum, item) => sum + Number(item.amount), 0)
    .toFixed(2);

  let invoiceId: string;
  try {
    invoiceId = await db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(invoices)
        .values({
          invoiceNumber: data.invoiceNumber,
          invoiceDate: data.invoiceDate,
          paymentTerms: data.paymentTerms ?? null,
          billToName: data.billToName,
          billToAddress: data.billToAddress ?? null,
          shipToName: data.shipToName ?? null,
          shipToAddress: data.shipToAddress ?? null,
          placeOfSupply: data.placeOfSupply ?? null,
          otherReference: data.otherReference ?? null,
          subject: data.subject ?? null,
          totalAmount,
          createdBy: appUser.id,
          updatedBy: appUser.id,
        })
        .returning({ id: invoices.id });

      await tx.insert(invoiceItems).values(
        itemsWithAmounts.map((item, index) => ({
          invoiceId: invoice.id,
          ...item,
          sortOrder: index,
        })),
      );

      return invoice.id;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "An invoice with this number already exists." };
    }
    throw err;
  }

  await logAudit({
    userId: appUser.id,
    action: "invoice_created",
    entityType: "invoice",
    entityId: invoiceId,
  });

  revalidatePath("/invoices");
  return { success: true, invoiceId };
}

export async function deleteInvoiceAction(invoiceId: string): Promise<void> {
  const { appUser } = await requireOptometrist();

  await db
    .delete(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.createdBy, appUser.id)));

  await logAudit({
    userId: appUser.id,
    action: "invoice_deleted",
    entityType: "invoice",
    entityId: invoiceId,
  });

  revalidatePath("/invoices");
  redirect("/invoices");
}
