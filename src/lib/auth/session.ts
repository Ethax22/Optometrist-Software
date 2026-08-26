import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type AppUser = Tables<"users">;

/**
 * The single server-side authorization boundary for the app. Every server
 * action / server component that touches patient data must call this --
 * middleware only guards page navigation and must never be relied on as
 * the actual authorization check.
 *
 * Confirms there is a real Supabase session AND that the corresponding
 * public.users row exists, has role 'optometrist', and is_active. Redirects
 * to /login otherwise.
 */
export async function requireOptometrist(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  authUserId: string;
  appUser: AppUser;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: appUser, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (userError || !appUser || appUser.role !== "optometrist" || !appUser.is_active) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return { supabase, authUserId: user.id, appUser };
}
