import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasAdminRole } from "@/lib/admin/roles";

export interface AdminSession {
  userId: string;
  email: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}

/**
 * Data Access Layer guard. Verifies the session JWT and the admin role, and
 * returns a client that queries as that user (RLS enforces it again in the DB).
 * Call it at the top of every admin read and Server Action.
 */
export const requireAdmin = cache(async (): Promise<AdminSession> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/admin/login");
  if (!hasAdminRole(claims.app_metadata)) redirect("/admin/login?error=sin-permiso");
  return { userId: claims.sub, email: String(claims.email ?? ""), supabase };
});
