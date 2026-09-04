// Live, per-request access gating — mirrors construct.shaoor-ai.com's
// getConstructCommercialAccess() pattern (part of the auth/subscription
// architecture unification; see the approved plan). Pets' own
// tenants/subscriptions tables are the source of truth (not a control-plane
// read — see lib/control-sync.ts's header comment for why), computed live
// on every request rather than cached, exactly like Construct.
//
// Unlike Construct, Pets has a permanent free tier ('litter') that must
// never be blocked — that property is preserved here as one more allowed
// state, not by skipping gating altogether (which is what happened before
// this change: requireActiveMembership() had no subscription check at all).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type PetsCommercialAccess = { allowed: boolean; reason?: "subscription" };

export async function getPetsCommercialAccess(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<PetsCommercialAccess> {
  const [{ data: tenant }, { data: subscription }] = await Promise.all([
    supabase.from("tenants").select("plan_code, trial_ends_at").eq("id", tenantId).maybeSingle(),
    supabase.from("subscriptions").select("status, current_period_end").eq("tenant_id", tenantId).maybeSingle(),
  ]);

  if (!tenant) return { allowed: false, reason: "subscription" };

  // Litter is the permanent free tier — always allowed, regardless of any
  // subscription row (there normally isn't one for a litter tenant).
  if (tenant.plan_code === "litter") return { allowed: true };

  if (subscription) {
    if (subscription.status === "trialing" || subscription.status === "active" || subscription.status === "past_due") {
      return { allowed: true };
    }
    if (subscription.status === "canceled" && subscription.current_period_end && new Date(subscription.current_period_end).getTime() > Date.now()) {
      return { allowed: true }; // cancelled but still inside the paid-for period
    }
    return { allowed: false, reason: "subscription" };
  }

  // No subscription row yet — allowed only while the initial trial hasn't lapsed.
  if (tenant.trial_ends_at && new Date(tenant.trial_ends_at).getTime() > Date.now()) {
    return { allowed: true };
  }

  return { allowed: false, reason: "subscription" };
}
