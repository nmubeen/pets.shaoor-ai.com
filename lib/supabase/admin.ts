// Service-role Supabase client — bypasses RLS entirely. Server-only, and only
// for code paths that must act outside a user's session: the Stripe webhook
// (no logged-in user on the request) and the trial-expiry cron sweep.
// Never import this from a Server Action or Route Handler that runs on
// behalf of a signed-in user — use lib/supabase/server.ts for those, so RLS
// stays the actual enforcement boundary.
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: "menagerie" },
    }
  );
}
