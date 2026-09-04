"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getRazorpay } from "@/lib/razorpay";

// Razorpay has no hosted "Customer Portal" the way Stripe does — this is
// the hand-built equivalent for the one thing that matters most:
// cancelling. cancel_at_cycle_end keeps the workspace on its current plan
// through the paid period already covered, matching the UX Stripe's
// portal gave for free; the webhook (subscription.cancelled, once the
// cycle actually ends) is still what flips plan_code to Litter.
export async function cancelSubscription(tenantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership || membership.role !== "owner") {
    return { error: "Only the workspace owner can manage billing." };
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("razorpay_subscription_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!subscription?.razorpay_subscription_id) {
    return { error: "No active subscription to cancel." };
  }

  try {
    await getRazorpay().subscriptions.cancel(subscription.razorpay_subscription_id, true);
  } catch (err) {
    return { error: (err as Error).message };
  }

  revalidatePath("/app/settings/billing");
  return { error: null };
}
