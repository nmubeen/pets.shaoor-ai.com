"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getRazorpay } from "@/lib/razorpay";
import { syncSubscriptionToControlPlane } from "@/lib/control-sync";

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

  // No owner_user_id filter — every household member has full access,
  // including billing (see 0036_household_members.sql), and RLS's
  // "tenant isolation - select" policy already scopes this to a tenant
  // this user can actually reach (owner or member).
  const { data: account } = await supabase.from("tenants").select("id").eq("id", tenantId).maybeSingle();

  if (!account) {
    return { error: "Account not found." };
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

  await syncSubscriptionToControlPlane(tenantId, "Household member requested cancellation");

  revalidatePath("/app/settings/billing");
  return { error: null };
}
