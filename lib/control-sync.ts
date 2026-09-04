// Best-effort mirror of this tenant's subscription state into
// shaoor-ai.com's shared control plane (/admin/subscriptions) — pets'
// own `tenants`/`subscriptions` tables stay the actual source of truth
// for gating; this is purely for the parent site's cross-product admin
// dashboard. Deliberately never throws into the caller — a failed sync
// just leaves the dashboard stale until the next lifecycle event, not a
// broken signup/payment/trial-expiry for the user. Called from signup,
// the Razorpay webhook, the trial-expiry cron, and the cancel action —
// see each for its `reason` string.
//
// shaoor-ai.com's control schema lives in this SAME physical Postgres
// database (menagerie/control/construct/chat are all schemas in one
// project) — this used to be an HTTP call to shaoor-ai.com, built on the
// mistaken belief it was a separate database. It isn't, so this now calls
// straight through to a wrapper RPC (menagerie.sync_control_subscription,
// see supabase/migrations/0024_control_sync_wrapper.sql) that internally
// invokes control.sync_shaoor_pets_subscription — no HTTP, no env vars,
// no round trip.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type ControlPlanCode = "LITTER" | "HOUSEHOLD" | "SANCTUARY" | "RESCUE";
type ControlStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED" | "EXPIRED";

const KNOWN_PLAN_CODES: ControlPlanCode[] = ["LITTER", "HOUSEHOLD", "SANCTUARY", "RESCUE"];

function toControlPlanCode(planCode: string): ControlPlanCode {
  const upper = planCode.toUpperCase();
  return (KNOWN_PLAN_CODES as string[]).includes(upper) ? (upper as ControlPlanCode) : "LITTER";
}

export async function syncSubscriptionToControlPlane(tenantId: string, reason: string) {
  try {
    const supabase = createAdminClient();
    const [{ data: tenant }, { data: subscription }, { data: owner }] = await Promise.all([
      supabase.from("tenants").select("id, name, plan_code, trial_ends_at").eq("id", tenantId).maybeSingle(),
      supabase.from("subscriptions").select("status, current_period_end").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("memberships").select("user_id, invited_email").eq("tenant_id", tenantId).eq("role", "owner").eq("status", "active").maybeSingle(),
    ]);
    if (!tenant) return;

    const trialActive = tenant.trial_ends_at ? new Date(tenant.trial_ends_at).getTime() > Date.now() : false;

    let status: ControlStatus;
    if (trialActive) status = "TRIALING";
    else if (subscription?.status === "active") status = "ACTIVE";
    else if (subscription?.status === "past_due") status = "PAST_DUE";
    else if (subscription?.status === "canceled") status = "CANCELLED";
    else status = "ACTIVE"; // litter (free), or a lapsed trial with no paid subscription — currently valid, just free

    const { error } = await supabase.rpc("sync_control_subscription", {
      p_tenant_id: tenant.id,
      p_tenant_name: tenant.name,
      p_owner_subject: owner?.user_id ?? null,
      p_owner_email: owner?.invited_email ?? null,
      p_plan_code: toControlPlanCode(tenant.plan_code),
      p_status: status,
      p_trial_ends_at: trialActive ? tenant.trial_ends_at : null,
      p_current_period_start: null,
      p_current_period_end: subscription?.current_period_end ?? null,
      p_reason: reason,
      p_correlation_id: `pets-sync-${tenantId}-${Date.now()}`,
    });
    if (error) console.error("Control plane sync failed (non-blocking)", error);
  } catch (error) {
    console.error("Control plane sync failed (non-blocking)", error);
  }
}
