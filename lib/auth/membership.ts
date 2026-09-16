// Shared cross-app membership gate (public.app_memberships / the
// register_app_membership / get_my_app_membership RPCs) — adapted from
// Launcher's src/lib/auth/membership.ts. This is an IDENTITY gate only
// ("does this account have standing access to Pets at all", e.g. an
// ops-level suspension) and is deliberately independent of Pets's own
// trial/subscription billing gate (lib/access/pets-commercial-access.ts,
// unchanged) — see the completion report for why the two are not merged.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { authAppConfig } from "./config";
import { logAuthDiagnostic } from "./diagnostics";

export type AppMembership = { status: string };

export function parseMembership(data: unknown): AppMembership | null {
  const row = Array.isArray(data) ? (data.length === 1 ? data[0] : null) : data;
  if (!row || typeof row !== "object" || !("status" in row) || typeof row.status !== "string") return null;
  return { status: row.status };
}

// Generic over the client's own SchemaName type param so this accepts the
// menagerie-scoped business client (default schema "menagerie") without
// an assignability mismatch; .schema() itself always targets "public"
// regardless of the caller's default schema. Used by lib/tenant.ts's
// per-request self-heal — the sign-in-time path uses
// registerAppMembershipOnAuthClient() below instead (see that function's
// own comment for why).
type SchemaClient<S extends string & keyof Database> = SupabaseClient<Database, S>;

/** Read-only lookup — does not create a row or touch last_login_at. */
export async function getAppMembership<S extends string & keyof Database>(client: SchemaClient<S>): Promise<AppMembership | null> {
  const { data, error } = await client.schema("public").rpc("get_my_app_membership", { p_app_key: authAppConfig.key });
  if (error) throw new Error("Membership lookup failed");
  return parseMembership(data);
}

/** Upserts the membership row (active/user on first call) and bumps
 * last_login_at — call this once per actual sign-in, not on every request.
 * For the menagerie-scoped business client; see
 * registerAppMembershipOnAuthClient() for the sign-in action's own client. */
export async function registerAppMembership<S extends string & keyof Database>(client: SchemaClient<S>): Promise<AppMembership | null> {
  const { data, error } = await client.schema("public").rpc("register_app_membership", { p_app_key: authAppConfig.key });
  if (error) throw new Error("Membership registration failed");
  return parseMembership(data);
}

/** Same upsert as registerAppMembership() above, but for
 * lib/auth/server.ts's dedicated auth-infrastructure client, whose own
 * default schema is already "public" — calls plain client.rpc(...), no
 * .schema() override, matching Launcher's implementation exactly (see
 * lib/auth/actions.ts, called once right after a successful verifyOtp on
 * the same client/request). Never used with the menagerie-scoped
 * business client — that one's calls always need the .schema("public")
 * override above, since its own default is "menagerie". */
export async function registerAppMembershipOnAuthClient(client: SupabaseClient<Database, "public">): Promise<AppMembership | null> {
  const { data, error } = await client.rpc("register_app_membership", { p_app_key: authAppConfig.key });
  if (error) throw new Error("Membership registration failed");
  return parseMembership(data);
}

/** Server-side per-request guard: a plain read, falling back to register()
 * only when no row exists yet — self-heals sessions that reached a
 * protected route without ever completing the sign-in registration step
 * (a race right after verifyOtp, or a session that predates this feature)
 * without re-bumping last_login_at on every ordinary page view. */
export async function ensureAppMembership<S extends string & keyof Database>(client: SchemaClient<S>): Promise<AppMembership | null> {
  const membership = await getAppMembership(client);
  if (membership) return membership;
  return registerAppMembership(client);
}

// User-facing copy stays deliberately generic for every "membership-*"
// reason (see app/auth/error/page.tsx) — a suspended/inactive/missing/
// RPC-failed membership must never be distinguishable to the caller. The
// `cause` param exists only so callers that already know WHY membership
// resolved to null (a thrown RPC error vs. a legitimately missing row)
// can log that distinction for diagnosis, without those categories ever
// leaking into the URL/UI.
export function membershipError(membership: AppMembership | null, cause?: "rpc-failed" | "missing") {
  if (membership?.status === "suspended") {
    logAuthDiagnostic("membership_suspended");
    return "membership-suspended";
  }
  if (membership?.status === "inactive") {
    logAuthDiagnostic("membership_inactive");
    return "membership-inactive";
  }
  logAuthDiagnostic(cause === "rpc-failed" ? "membership_rpc_failed" : "membership_missing");
  return "membership-unavailable";
}
