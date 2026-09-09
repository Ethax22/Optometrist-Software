import Link from "next/link";
import { and, or, ilike, eq, count } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { patients } from "@/lib/db/schema";
import { requireOptometrist } from "@/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchResultsTable } from "./search-results-table";

const PAGE_SIZE = 20;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { appUser } = await requireOptometrist();
  const { q, page: pageParam } = await searchParams;
  const query = (q?.trim() ?? "").slice(0, 200);
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const ip = await getClientIp();
  const rateLimit = query ? checkRateLimit(`search:${ip}`, 60, 60 * 1000) : { allowed: true };

  const shouldQuery = Boolean(query) && rateLimit.allowed;

  const whereClause = shouldQuery
    ? and(
        eq(patients.createdBy, appUser.id),
        or(
          ilike(patients.name, `%${query}%`),
          ilike(patients.uidEmpId, `%${query}%`),
          ilike(patients.mobile, `%${query}%`),
        ),
      )
    : undefined;

  const [results, [{ total }]] = await Promise.all([
    shouldQuery
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
    shouldQuery
      ? db.select({ total: count() }).from(patients).where(whereClause)
      : Promise.resolve([{ total: 0 }]),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Search Patients</h1>
          <p className="text-muted-foreground">Search by name, UID/Emp Id, or mobile.</p>
        </div>
        <Button variant="outline" size="sm" render={<a href="/api/prescriptions/export/csv" />}>
          Export All Prescriptions (CSV)
        </Button>
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

      {query && !rateLimit.allowed && (
        <p className="text-sm text-destructive">
          Too many searches. Please wait a moment and try again.
        </p>
      )}

      {shouldQuery && (
        <>
          <SearchResultsTable results={results} />

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
