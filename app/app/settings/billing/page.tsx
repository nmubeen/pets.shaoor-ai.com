import { Card, Badge } from "@/components/ui";
import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";

// Payment processing (Stripe) is intentionally not wired up yet — see
// lib/stripe.ts and app/api/stripe/* for the scaffolding, left in place but
// disconnected from the UI. Everything on this page (plan, trial, usage)
// is real data from menagerie.tenants / .subscriptions / .plans; there's
// just no way to pay yet, and the trial downgrades to Litter automatically
// via the cron sweep with no card ever required.

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export default async function BillingPage() {
  const { supabase, active } = await requireActiveMembership();

  const [{ data: plan }, { data: subscription }, roster, { count: seatCount }] = await Promise.all([
    supabase.from("plans").select("*").eq("code", active.planCode).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("tenant_id", active.tenantId).maybeSingle(),
    getRoster(supabase, active.tenantId),
    supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", active.tenantId)
      .eq("status", "active"),
  ]);

  const isTrialing = subscription?.status === "trialing" && active.trialEndsAt;
  const price = plan?.price_monthly_inr;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl mb-1">Billing</h1>
        <p className="text-sm text-muted">
          {active.tenantName} · your role: {active.role}
        </p>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 font-semibold text-base">
              {plan?.name ?? active.planCode}
              {isTrialing && <Badge tone="trial">trial</Badge>}
            </div>
            <div className="text-xs text-muted mt-1">
              {isTrialing
                ? `Ends ${fmtDate(active.trialEndsAt)}${price ? ` · then ₹${price}/mo` : ""} · no card required`
                : price
                  ? `₹${price}/mo`
                  : "Contact sales for pricing"}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-4">Usage against your plan</h2>
        <div className="flex flex-col divide-y divide-line">
          <div className="flex justify-between py-2.5 text-sm">
            <span className="text-muted">Pets used</span>
            <span className="font-mono">
              {roster.length} of {plan?.pet_limit ?? "unlimited"}
            </span>
          </div>
          <div className="flex justify-between py-2.5 text-sm">
            <span className="text-muted">Seats used</span>
            <span className="font-mono">
              {seatCount ?? 0} of {plan?.seat_limit ?? "unlimited"}
            </span>
          </div>
          <div className="flex justify-between py-2.5 text-sm">
            <span className="text-muted">Locations</span>
            <span className="font-mono">1 of {plan?.location_limit ?? "unlimited"}</span>
          </div>
        </div>
      </Card>

      <p className="text-xs text-muted">
        Payment isn&rsquo;t wired up yet — when your trial ends without a
        plan change, this workspace moves to the free Litter tier
        automatically. No card is collected at any point today.
      </p>
    </div>
  );
}
