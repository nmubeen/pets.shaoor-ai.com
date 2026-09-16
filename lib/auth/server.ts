// Auth-infrastructure Supabase server client — dedicated to Supabase Auth
// itself and the shared public-schema RPCs (register_app_membership /
// get_my_app_membership), mirroring Launcher's createAuthServerClient()
// (src/lib/auth/server.ts). Deliberately separate from
// lib/supabase/server.ts's business-data client (schema "menagerie"):
// this one's default schema is "public", matching Launcher's own client
// exactly, so the membership RPC can be called as a plain client.rpc(...)
// — no .schema("public") override needed at the call site (see
// lib/auth/membership.ts's registerAppMembershipOnAuthClient and
// lib/auth/actions.ts). Never used for tenants/subscriptions/students/
// sessions — that stays on lib/supabase/server.ts's client.
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function createAuthServerClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseConfig();

  return createServerClient<Database, "public">(
    url,
    key,
    {
      db: { schema: "public" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — the proxy refreshes
            // the session instead, so this can be safely ignored.
          }
        },
      },
    }
  );
}
