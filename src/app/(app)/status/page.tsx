import Link from "next/link";
import { eq, and, gte, lte, asc, desc } from "drizzle-orm";
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
import {
  parseStatusRange,
  resolveStatusRange,
  statusRangeLabel,
} from "@/lib/status/date-range";
import { StatusDateNav } from "./status-date-nav";

function prettyDate(date: string) {
  return format(new Date(`${date}T00:00:00`), "PPP");
}

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; range?: string }>;
}) {
  const { date: dateParam, range: rangeParam } = await searchParams;
  const date =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : format(new Date(), "yyyy-MM-dd");
  const range = parseStatusRange(rangeParam);
  const { start, end } = resolveStatusRange(range, date);
  const isSingleDay = range === "day";

  const visits = await db
    .select({
      consultationId: consultations.id,
      consultationDate: consultations.consultationDate,
      createdAt: consultations.createdAt,
      patientName: patients.name,
      patientUid: patients.uidEmpId,
      hasPrescription: prescriptions.id,
    })
    .from(consultations)
    .innerJoin(patients, eq(consultations.patientId, patients.id))
    .leftJoin(prescriptions, eq(prescriptions.consultationId, consultations.id))
    .where(
      start && end
        ? and(
            gte(consultations.consultationDate, start),
            lte(consultations.consultationDate, end),
          )
        : undefined,
    )
    // A single day reads best oldest-first (the clinic's running order); a
    // multi-day range reads best newest-first.
    .orderBy(
      ...(isSingleDay
        ? [asc(consultations.createdAt)]
        : [desc(consultations.consultationDate), desc(consultations.createdAt)]),
    );

  const periodDescription =
    range === "all"
      ? "across all dates"
      : isSingleDay
        ? `on ${prettyDate(date)}`
        : `from ${prettyDate(start!)} to ${prettyDate(end!)}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Status</h1>
          <p className="text-muted-foreground">
            {visits.length} patient{visits.length === 1 ? "" : "s"} {periodDescription}
          </p>
        </div>
        <StatusDateNav date={date} range={range} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isSingleDay ? "Daily Patient List" : `Patient List — ${statusRangeLabel(range)}`}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {!isSingleDay && <TableHead>Date</TableHead>}
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
                  <TableCell colSpan={isSingleDay ? 5 : 6} className="text-center text-muted-foreground">
                    {isSingleDay ? "No patients on this date." : "No patients in this period."}
                  </TableCell>
                </TableRow>
              ) : (
                visits.map((visit) => (
                  <TableRow key={visit.consultationId}>
                    {!isSingleDay && (
                      <TableCell>{format(new Date(`${visit.consultationDate}T00:00:00`), "PP")}</TableCell>
                    )}
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
