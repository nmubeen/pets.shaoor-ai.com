import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel Cron hits this daily (see vercel.json). Vercel automatically sends
// `Authorization: Bearer $CRON_SECRET` on cron-triggered requests when a
// CRON_SECRET env var is set, so this also doubles as a manual-trigger guard.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: expired } = await supabase
    .from("tenants")
    .select("id")
    .not("trial_ends_at", "is", null)
    .lt("trial_ends_at", new Date().toISOString());

  const expiredIds = (expired ?? []).map((t) => t.id);
  if (expiredIds.length === 0) return NextResponse.json({ downgraded: 0 });

  // A trial with no card on file never got a subscriptions row past
  // 'trialing' — those are the only tenants this sweep should touch.
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("tenant_id, status")
    .in("tenant_id", expiredIds);

  const subByTenant = new Map((subs ?? []).map((s) => [s.tenant_id, s.status]));
  const toDowngrade = expiredIds.filter((id) => {
    const status = subByTenant.get(id);
    return !status || status === "trialing";
  });

  if (toDowngrade.length > 0) {
    await supabase
      .from("tenants")
      .update({ plan_code: "litter", trial_ends_at: null })
      .in("id", toDowngrade);
  }

  return NextResponse.json({ downgraded: toDowngrade.length });
}
