import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Home</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/register">
          <Card className="h-full transition-colors hover:border-primary">
            <CardHeader>
              <CardTitle>Register New Patient</CardTitle>
              <CardDescription>
                Start a new consultation: patient details, then examination.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/search">
          <Card className="h-full transition-colors hover:border-primary">
            <CardHeader>
              <CardTitle>Search Patients</CardTitle>
              <CardDescription>
                Find an existing patient by name, UID/Emp Id, or mobile.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
