import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

// Starts a Stripe Checkout session to add a card / upgrade a tenant's plan.
// Only the tenant owner may do this — matches §05/§12 of the design doc.
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
    .select("code, stripe_price_id_monthly, stripe_price_id_annual")
    .eq("code", planCode)
    .maybeSingle();

  const priceId = interval === "annual" ? plan?.stripe_price_id_annual : plan?.stripe_price_id_monthly;
  if (!priceId) {
    return NextResponse.json({ error: "This plan isn't purchasable online yet." }, { status: 400 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const origin = new URL(request.url).origin;

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: subscription?.stripe_customer_id ?? undefined,
    customer_email: subscription?.stripe_customer_id ? undefined : user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/app/settings/billing?checkout=success`,
    cancel_url: `${origin}/app/settings/billing?checkout=canceled`,
    metadata: { tenant_id: tenantId, plan_code: planCode },
    subscription_data: { metadata: { tenant_id: tenantId, plan_code: planCode } },
  });

  return NextResponse.json({ url: session.url });
}
