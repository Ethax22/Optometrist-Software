import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Server-side Supabase client for use in Server Components, Server Actions,
 * and Route Handlers. Reads/writes the auth cookie via Next's cookies() API.
 *
 * In a Server Component, cookies() cannot be written (no response to attach
 * to), so setAll is wrapped in a try/catch -- middleware is responsible for
 * refreshing the session cookie on every request in that case.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render -- middleware handles
            // session refresh instead.
          }
        },
      },
    },
  );
}

/**
 * Service-role client for privileged server-only operations (audit log
 * writes across users, admin-style provisioning). Never import this into
 * any client-facing code path -- it bypasses RLS entirely.
 */
export function createServiceRoleClient() {
  return createSupabaseJsClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
