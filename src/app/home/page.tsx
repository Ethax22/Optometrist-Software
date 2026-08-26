import { requireOptometrist } from "@/lib/auth/session";
import { LogoutButton } from "@/components/logout-button";

export default async function HomePage() {
  const { appUser } = await requireOptometrist();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Home</h1>
        <LogoutButton />
      </div>
      <p className="text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{appUser.email}</span>.
      </p>
      <p className="text-sm text-muted-foreground">
        Registration and Search will live here (Phase 3+).
      </p>
    </div>
  );
}
