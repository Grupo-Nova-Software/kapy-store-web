"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseEnv } from "@/lib/supabase/env";

let client: SupabaseClient<Database> | null = null;

/**
 * Browser client sharing the admin session (cookies set at login).
 * Used for direct-to-Storage photo uploads from the admin panel.
 */
export function getSupabaseBrowser(): SupabaseClient<Database> {
  const { url, anonKey } = supabaseEnv();
  client ??= createBrowserClient<Database>(url, anonKey);
  return client;
}
