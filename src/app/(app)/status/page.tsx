import Link from "next/link";
import { eq, asc } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/lib/db/client";
import { consultations, patients, prescriptions } from "@/lib/db/schema";
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
import { StatusDateNav } from "./status-date-nav";

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : format(new Date(), "yyyy-MM-dd");

  const visits = await db
    .select({
      consultationId: consultations.id,
      createdAt: consultations.createdAt,
      patientName: patients.name,
      patientUid: patients.uidEmpId,
      hasPrescription: prescriptions.id,
    })
    .from(consultations)
    .innerJoin(patients, eq(consultations.patientId, patients.id))
    .leftJoin(prescriptions, eq(prescriptions.consultationId, consultations.id))
    .where(eq(consultations.consultationDate, date))
    .orderBy(asc(consultations.createdAt));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Status</h1>
          <p className="text-muted-foreground">
            {visits.length} patient{visits.length === 1 ? "" : "s"} on {format(new Date(`${date}T00:00:00`), "PPP")}
          </p>
        </div>
        <StatusDateNav date={date} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Patient List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Patient Name</TableHead>
                <TableHead>UID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No patients on this date.
                  </TableCell>
                </TableRow>
              ) : (
                visits.map((visit) => (
                  <TableRow key={visit.consultationId}>
                    <TableCell>{format(visit.createdAt, "p")}</TableCell>
                    <TableCell>{visit.patientName}</TableCell>
                    <TableCell>{visit.patientUid}</TableCell>
                    <TableCell>{visit.hasPrescription ? "Saved" : "Draft"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link href={`/examination/${visit.consultationId}`} />}
                      >
                        View / Edit
                      </Button>
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
