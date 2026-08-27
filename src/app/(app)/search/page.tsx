import Link from "next/link";
import { or, ilike, count } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { patients } from "@/lib/db/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const whereClause = query
    ? or(
        ilike(patients.name, `%${query}%`),
        ilike(patients.uidEmpId, `%${query}%`),
        ilike(patients.mobile, `%${query}%`),
      )
    : undefined;

  const [results, [{ total }]] = await Promise.all([
    query
      ? db
          .select({
            id: patients.id,
            name: patients.name,
            uidEmpId: patients.uidEmpId,
            age: patients.age,
            gender: patients.gender,
            mobile: patients.mobile,
          })
          .from(patients)
          .where(whereClause)
          .orderBy(patients.name)
          .limit(PAGE_SIZE)
          .offset(offset)
      : Promise.resolve([]),
    query
      ? db.select({ total: count() }).from(patients).where(whereClause)
      : Promise.resolve([{ total: 0 }]),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Search Patients</h1>
        <p className="text-muted-foreground">Search by name, UID/Emp Id, or mobile.</p>
      </div>

      <form method="GET" className="flex gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Name, UID/Emp Id, or mobile"
          autoFocus
        />
        <Button type="submit">Search</Button>
      </form>

      {query && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>UID / Emp Id</TableHead>
                <TableHead>Age / Gender</TableHead>
                <TableHead>Mobile</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No patients found.
                  </TableCell>
                </TableRow>
              ) : (
                results.map((patient) => (
                  <TableRow key={patient.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/patients/${patient.id}`} className="block">
                        {patient.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/patients/${patient.id}`} className="block">
                        {patient.uidEmpId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/patients/${patient.id}`} className="block">
                        {patient.age} / {patient.gender}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/patients/${patient.id}`} className="block">
                        {patient.mobile ?? "-"}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} &middot; {total} result{total === 1 ? "" : "s"}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/search?q=${encodeURIComponent(query)}&page=${page - 1}`} />}
                  >
                    Previous
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                )}
                {page < totalPages ? (
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`} />}
                  >
                    Next
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
