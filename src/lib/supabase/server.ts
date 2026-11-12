import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Supabase client bound to the admin's session cookies (Server Components,
 * Server Actions). Every query runs as the logged-in user, so RLS applies.
 * Create one per request — never share it.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const { url, anonKey } = supabaseEnv();
  // supabase-js reads the clock (Date.now) while loading the session, which
  // Next forbids during a (runtime) prerender. Run auth only at request time.
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The proxy refreshes the session on every /admin request instead.
        }
      },
    },
  });
}
