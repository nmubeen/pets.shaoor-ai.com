import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { logAuthDiagnostic } from "./diagnostics";

/** Membership-gated, idempotent household provisioning. Never throws. */
export async function ensurePetsAccountForCurrentUser(client: SupabaseClient<Database, "menagerie">): Promise<boolean> {
  try {
    const { data, error } = await client.rpc("ensure_my_account", {});
    if (!error && data) return true;
  } catch {
    // Network failures have the same safe result as a rejected RPC.
  }
  logAuthDiagnostic("tenant_provisioning_failed");
  return false;
}
