import { requireOptometrist } from "@/lib/auth/session";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { appUser } = await requireOptometrist();

  return (
    <div className="flex min-h-svh flex-col">
      <AppNav email={appUser.email} />
      <main className="flex-1 bg-muted/20">{children}</main>
    </div>
  );
}
