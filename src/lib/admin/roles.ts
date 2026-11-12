/** `app_metadata.role` — only settable with the service role (see supabase-schema.sql). */
export const ADMIN_ROLE = "admin";

export function hasAdminRole(appMetadata: unknown): boolean {
  return (
    typeof appMetadata === "object" &&
    appMetadata !== null &&
    (appMetadata as Record<string, unknown>).role === ADMIN_ROLE
  );
}
