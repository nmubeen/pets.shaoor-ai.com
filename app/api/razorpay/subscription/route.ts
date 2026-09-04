import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRazorpay } from "@/lib/razorpay";

// Creates a Razorpay Subscription and hands the id back to the browser,
// which opens Razorpay's Checkout.js modal for it (components/billing/
// RazorpayCheckout.tsx) — unlike Stripe Checkout there's no hosted page to
// redirect to. Only the tenant owner may do this — matches §05/§12 of the
// design doc.
//
// Razorpay subscriptions require a total_count (number of billing cycles) —
// there's no "renews forever" option, so this uses a long-but-finite count
// (10 years) and treats cancellation, not expiry, as the real end.
const TOTAL_CYCLES = { monthly: 120, annual: 10 } as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { tenantId, planCode, interval } = (await request.json()) as {
    tenantId: string;
    planCode: string;
    interval: "monthly" | "annual";
  };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "Only the workspace owner can manage billing." }, { status: 403 });
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("code, razorpay_plan_id_monthly, razorpay_plan_id_annual")
    .eq("code", planCode)
    .maybeSingle();

  const razorpayPlanId = interval === "annual" ? plan?.razorpay_plan_id_annual : plan?.razorpay_plan_id_monthly;
  if (!razorpayPlanId) {
    return NextResponse.json({ error: "This plan isn't purchasable online yet." }, { status: 400 });
  }

  try {
    const subscription = await getRazorpay().subscriptions.create({
      plan_id: razorpayPlanId,
      total_count: TOTAL_CYCLES[interval],
      customer_notify: 1,
      notes: { tenant_id: tenantId, plan_code: planCode },
    });

    return NextResponse.json({ subscriptionId: subscription.id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
