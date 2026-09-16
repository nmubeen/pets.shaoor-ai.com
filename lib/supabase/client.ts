// Browser Supabase client — safe to import from "use client" components.
// Uses the anon key, subject to RLS at all times.
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";
import type { Database } from "@/lib/database.types";

export function createClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient<Database, "menagerie">(
    url,
    key,
    { db: { schema: "menagerie" }, auth: { detectSessionInUrl: false } }
  );
}
