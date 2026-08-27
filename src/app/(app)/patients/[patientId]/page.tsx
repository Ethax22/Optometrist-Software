import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { patients, consultations, prescriptions } from "@/lib/db/schema";
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
import { NewVisitForm } from "./new-visit-form";

export default async function PatientPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;

  const [patient] = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
  if (!patient) {
    notFound();
  }

  const history = await db
    .select({
      consultationId: consultations.id,
      consultationDate: consultations.consultationDate,
      hasPrescription: prescriptions.id,
    })
    .from(consultations)
    .leftJoin(prescriptions, eq(prescriptions.consultationId, consultations.id))
    .where(eq(consultations.patientId, patientId))
    .orderBy(desc(consultations.consultationDate));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{patient.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">UID / Emp Id:</span> {patient.uidEmpId}
          </p>
          <p>
            <span className="text-muted-foreground">Age / Gender:</span> {patient.age} /{" "}
            {patient.gender}
          </p>
          <p>
            <span className="text-muted-foreground">Mobile:</span> {patient.mobile ?? "-"}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {patient.email ?? "-"}
          </p>
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">Address:</span> {patient.address ?? "-"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Start a New Visit</CardTitle>
        </CardHeader>
        <CardContent>
          <NewVisitForm patientId={patient.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prescription History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No consultations yet.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((visit) => (
                  <TableRow key={visit.consultationId}>
                    <TableCell>{visit.consultationDate}</TableCell>
                    <TableCell>{visit.hasPrescription ? "Saved" : "Draft"}</TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link href={`/examination/${visit.consultationId}`} />}
                      >
                        View
                      </Button>
                      <Button variant="outline" size="sm" disabled={!visit.hasPrescription}>
                        Download
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
