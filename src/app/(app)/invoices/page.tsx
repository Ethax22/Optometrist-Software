import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invoices } from "@/lib/db/schema";
import { requireOptometrist } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { deleteInvoiceAction } from "@/lib/invoices/actions";

export default async function InvoicesPage() {
  const { appUser } = await requireOptometrist();

  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.createdBy, appUser.id))
    .orderBy(desc(invoices.invoiceDate), desc(invoices.createdAt));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Invoices</CardTitle>
          <Button render={<Link href="/invoices/new" />}>New Invoice</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Bill To</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No invoices yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.invoiceDate}</TableCell>
                    <TableCell>{invoice.billToName}</TableCell>
                    <TableCell className="text-right">{invoice.totalAmount}</TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        render={<a href={`/api/invoices/${invoice.id}/pdf`} />}
                      >
                        Download PDF
                      </Button>
                      <ConfirmDeleteDialog
                        action={deleteInvoiceAction.bind(null, invoice.id)}
                        triggerLabel="Delete"
                        title="Delete this invoice?"
                        description={`This permanently deletes invoice ${invoice.invoiceNumber}. This cannot be undone.`}
                        confirmLabel="Delete Invoice"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
