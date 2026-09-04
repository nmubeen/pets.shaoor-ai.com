// Server-side helpers for resolving "who is signed in, and which workspace
// are they currently looking at". A user can belong to more than one
// tenant (§04); the active one is remembered in a cookie and defaults to
// the first membership found.
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { MembershipRole } from "@/lib/database.types";

const ACTIVE_TENANT_COOKIE = "menagerie_active_tenant";

export type ActiveMembership = {
  tenantId: string;
  tenantName: string;
  planCode: string;
  trialEndsAt: string | null;
  role: MembershipRole;
};

/** Redirects to /login if there's no signed-in user. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Redirects to /login if signed out, or to /signup if signed in but with no
 * workspace at all (shouldn't normally happen — handle_new_user creates one
 * at signup — but covers an unconfirmed-email edge case gracefully).
 */
export async function requireActiveMembership(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  memberships: ActiveMembership[];
  active: ActiveMembership;
}> {
  const { supabase, user } = await requireUser();

  await supabase.rpc("accept_pending_invites");

  const { data: rows } = await supabase
    .from("memberships")
    .select("tenant_id, role, tenants(name, plan_code, trial_ends_at)")
    .eq("user_id", user.id)
    .eq("status", "active");

  const memberships: ActiveMembership[] = (rows ?? [])
    .filter((r) => r.tenants)
    .map((r) => ({
      tenantId: r.tenant_id,
      tenantName: (r.tenants as unknown as { name: string }).name,
      planCode: (r.tenants as unknown as { plan_code: string }).plan_code,
      trialEndsAt: (r.tenants as unknown as { trial_ends_at: string | null }).trial_ends_at,
      role: r.role,
    }));

  if (memberships.length === 0) {
    redirect("/signup");
  }

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value;
  const active = memberships.find((m) => m.tenantId === preferred) ?? memberships[0];

  return { supabase, user, memberships, active };
}

export { ACTIVE_TENANT_COOKIE };
