// Best-effort mirror of this tenant's subscription state into
// shaoor-ai.com's shared control plane (/admin/subscriptions) — pets'
// own `tenants`/`subscriptions` tables stay the actual source of truth
// for gating; this is purely for the parent site's cross-product admin
// dashboard. Deliberately never throws into the caller — a failed sync
// just leaves the dashboard stale until the next lifecycle event, not a
// broken signup/payment/trial-expiry for the user. Called from signup,
// the Razorpay webhook, the trial-expiry cron, and the cancel action —
// see each for its `reason` string.
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
    const controlPlaneUrl = process.env.SHAOOR_CONTROL_PLANE_URL;
    const secret = process.env.PETS_CONTROL_SECRET;
    if (!controlPlaneUrl || !secret) return; // not configured locally — silently skip, same as sendEmail's soft-fail

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

    await fetch(`${controlPlaneUrl}/api/control/sync/pets`, {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        tenantId: tenant.id,
        tenantName: tenant.name,
        ownerSubject: owner?.user_id ?? null,
        ownerEmail: owner?.invited_email ?? null,
        planCode: toControlPlanCode(tenant.plan_code),
        status,
        trialEndsAt: trialActive ? tenant.trial_ends_at : null,
        currentPeriodStart: null,
        currentPeriodEnd: subscription?.current_period_end ?? null,
        reason,
        correlationId: `pets-sync-${tenantId}-${Date.now()}`,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error("Control plane sync failed (non-blocking)", error);
  }
}
