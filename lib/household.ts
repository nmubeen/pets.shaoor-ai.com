// Household members — full access, no roles (see
// supabase/migrations/0036_household_members.sql for why there's no role
// column). The owner isn't a row here; this only lists invited/joined
// members alongside the owner.
import "server-only";
import type { createClient } from "@/lib/supabase/server";

export type HouseholdMember = {
  id: string;
  email: string;
  status: "invited" | "active";
  createdAt: string;
};

export type PendingInvite = {
  id: string;
  tenantName: string;
};

/**
 * A pending invite for the signed-in user's own email, if any — regardless
 * of which tenant it's for (the invited_email = auth.email() RLS escape
 * hatch, 0039_household_switch.sql, is what makes this visible before
 * they've joined anything). Used to prompt the switch-household decision
 * when someone who already owns a household gets invited elsewhere.
 */
export async function getMyPendingInvite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string
): Promise<PendingInvite | null> {
  const { data: invite } = await supabase
    .from("household_members")
    .select("id, tenant_id")
    .ilike("invited_email", email)
    .eq("status", "invited")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!invite) return null;

  const { data: tenant } = await supabase.from("tenants").select("name").eq("id", invite.tenant_id).maybeSingle();
  return { id: invite.id, tenantName: tenant?.name ?? "a household" };
}

export async function getHouseholdMembers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<HouseholdMember[]> {
  const { data } = await supabase
    .from("household_members")
    .select("id, invited_email, status, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at");

  return (data ?? []).map((m) => ({
    id: m.id,
    email: m.invited_email,
    status: m.status,
    createdAt: m.created_at,
  }));
}
