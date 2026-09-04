import { Card, Badge } from "@/components/ui";
import { RazorpayCheckout } from "@/components/billing/RazorpayCheckout";
import { CancelSubscriptionButton } from "@/components/billing/CancelSubscriptionButton";
import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export default async function BillingPage() {
  const { supabase, user, active } = await requireActiveMembership();

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

  const isOwner = active.role === "owner";
  const isTrialing = subscription?.status === "trialing" && active.trialEndsAt;
  const isPaying = subscription?.status === "active" && subscription.razorpay_subscription_id;
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
              {subscription?.status === "past_due" && <Badge tone="due">past due</Badge>}
            </div>
            <div className="text-xs text-muted mt-1">
              {isTrialing
                ? `Ends ${fmtDate(active.trialEndsAt)}${price ? ` · then ₹${price}/mo` : ""} · no card required`
                : price
                  ? `₹${price}/mo`
                  : "Contact sales for pricing"}
            </div>
          </div>
          {isOwner &&
            (isPaying ? (
              <CancelSubscriptionButton
                tenantId={active.tenantId}
                className="text-sm text-muted border border-line rounded-lg px-4 py-2.5 hover:text-ink hover:bg-surface-2 transition"
              />
            ) : (
              <RazorpayCheckout
                tenantId={active.tenantId}
                planCode={active.planCode === "litter" ? "household" : active.planCode}
                workspaceName={active.tenantName}
                userEmail={user.email}
                className="bg-primary text-primary-ink text-sm font-semibold px-4 py-2.5 rounded-lg hover:brightness-110 transition disabled:opacity-60"
              >
                Add card
              </RazorpayCheckout>
            ))}
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

      {!isOwner && <p className="text-xs text-muted">Only the workspace owner can manage billing.</p>}

      <p className="text-xs text-muted">
        Payments are processed by Razorpay — Menagerie never stores your card
        or UPI details directly. Cancelling keeps this plan through the
        period you&rsquo;ve already paid for; after that, the workspace
        moves to the free Litter tier automatically, same as a trial that
        lapses without a card.
      </p>
    </div>
  );
}
