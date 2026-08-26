import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Optometrist Sign In</CardTitle>
          <CardDescription>Sign in to manage patient prescriptions.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={next?.startsWith("/") ? next : "/home"} />
        </CardContent>
      </Card>
    </div>
  );
}
