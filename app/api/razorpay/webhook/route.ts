import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createAdminClient } from "@/lib/supabase/admin";

// The only writer of menagerie.subscriptions (§05) — same trust boundary as
// the old Stripe webhook. No user session exists on this request, so it
// uses the service-role admin client and bypasses RLS by design.
//
// Signature check uses the SDK's own validateWebhookSignature (HMAC-SHA256
// over the raw body, keyed with the webhook secret from the Razorpay
// dashboard, checked against the `x-razorpay-signature` header) — proof
// this call actually came from Razorpay before trusting any of it.
const STATUS_MAP: Record<string, "trialing" | "active" | "past_due" | "canceled"> = {
  created: "trialing",
  authenticated: "trialing",
  active: "active",
  charged: "active",
  pending: "past_due",
  halted: "past_due",
  cancelled: "canceled",
  completed: "canceled",
  expired: "canceled",
};

type RazorpaySubscriptionEntity = {
  id: string;
  customer_id?: string;
  status: string;
  current_end?: number | null;
  notes?: { tenant_id?: string; plan_code?: string };
};

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const valid = Razorpay.validateWebhookSignature(body, signature, secret);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const event = JSON.parse(body) as {
    event: string;
    payload?: { subscription?: { entity: RazorpaySubscriptionEntity } };
  };

  const subscription = event.payload?.subscription?.entity;
  const tenantId = subscription?.notes?.tenant_id;

  if (subscription && tenantId) {
    const supabase = createAdminClient();
    const status = STATUS_MAP[subscription.status] ?? "active";

    await supabase.from("subscriptions").upsert(
      {
        tenant_id: tenantId,
        razorpay_customer_id: subscription.customer_id ?? null,
        razorpay_subscription_id: subscription.id,
        status,
        current_period_end: subscription.current_end
          ? new Date(subscription.current_end * 1000).toISOString()
          : null,
      },
      { onConflict: "tenant_id" }
    );

    if (status === "active" || status === "trialing") {
      const planCode = subscription.notes?.plan_code;
      if (planCode) {
        await supabase.from("tenants").update({ plan_code: planCode, trial_ends_at: null }).eq("id", tenantId);
      }
    } else if (status === "canceled") {
      await supabase.from("tenants").update({ plan_code: "litter", trial_ends_at: null }).eq("id", tenantId);
    }
  }

  return NextResponse.json({ received: true });
}
