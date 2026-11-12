import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Public (anon / publishable key) Supabase client.
 *
 * Safe to use on server and client: the key only grants what the RLS policies
 * in `supabase-schema.sql` allow (public read of the catalog). Admin writes
 * will use an authenticated session in the /admin panel.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase no está configurado: definí NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local",
    );
  }
  client ??= createClient<Database>(url, anonKey, {
    auth: {
      // The public catalog has no user session.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}

/** Public URL of a file in the `product-images` bucket. */
export function productImageUrl(path: string): string {
  return getSupabase().storage.from("product-images").getPublicUrl(path).data.publicUrl;
}
