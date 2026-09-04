import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// The only writer of menagerie.subscriptions (§05). No user session exists
// on this request, so it uses the service-role admin client and bypasses
// RLS by design — everything it trusts comes from Stripe's verified payload.
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  async function upsertFromSubscription(subscription: Stripe.Subscription) {
    const tenantId = subscription.metadata?.tenant_id;
    if (!tenantId) return;

    const status = subscription.status as
      | "trialing"
      | "active"
      | "past_due"
      | "canceled"
      | string;
    const mappedStatus = (["trialing", "active", "past_due", "canceled"] as const).includes(
      status as "trialing" | "active" | "past_due" | "canceled"
    )
      ? (status as "trialing" | "active" | "past_due" | "canceled")
      : "active";

    const currentPeriodEnd = subscription.items.data[0]?.current_period_end;

    await supabase.from("subscriptions").upsert(
      {
        tenant_id: tenantId,
        stripe_customer_id:
          typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
        stripe_subscription_id: subscription.id,
        status: mappedStatus,
        current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
      },
      { onConflict: "tenant_id" }
    );

    if (subscription.status === "active" || subscription.status === "trialing") {
      const planCode = subscription.metadata?.plan_code;
      if (planCode) {
        await supabase
          .from("tenants")
          .update({ plan_code: planCode, trial_ends_at: null })
          .eq("id", tenantId);
      }
    } else if (subscription.status === "canceled") {
      await supabase.from("tenants").update({ plan_code: "litter", trial_ends_at: null }).eq("id", tenantId);
    }
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertFromSubscription(subscription);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await upsertFromSubscription(event.data.object as Stripe.Subscription);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
