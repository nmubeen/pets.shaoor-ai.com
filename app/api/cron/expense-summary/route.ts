import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { emailShell, emailButton } from "@/lib/email-templates";
import { formatCurrency } from "@/lib/format";

// The "weekly expense-summary email" from §06 of the design doc. Same cost
// rollup as lib/shopping.ts's getSpendSummary (shopping + visits), just
// over the last 7 days and across every tenant instead of one.

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pets.shaoor-ai.com";

  const [{ data: orders }, { data: visits }] = await Promise.all([
    supabase.from("shopping_orders").select("tenant_id, cost").gte("order_date", since),
    supabase.from("visits").select("tenant_id, cost").gte("visit_date", since),
  ]);

  const totals = new Map<string, number>();
  for (const row of [...(orders ?? []), ...(visits ?? [])]) {
    totals.set(row.tenant_id, (totals.get(row.tenant_id) ?? 0) + (row.cost ?? 0));
  }

  let sent = 0;
  for (const [tenantId, total] of totals) {
    if (total <= 0) continue;

    const [{ data: tenant }, { data: owner }] = await Promise.all([
      supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
      supabase
        .from("memberships")
        .select("invited_email")
        .eq("tenant_id", tenantId)
        .eq("role", "owner")
        .eq("status", "active")
        .maybeSingle(),
    ]);
    if (!owner?.invited_email) continue;

    const { error } = await sendEmail({
      to: owner.invited_email,
      subject: `Your week in ${tenant?.name ?? "Menagerie"}: ${formatCurrency(total)} spent`,
      html: emailShell(
        "Weekly expense summary",
        `<p>Over the last 7 days, <strong>${tenant?.name ?? "your workspace"}</strong> spent
           <strong style="font-size:20px;">${formatCurrency(total)}</strong> across shopping and visits.</p>
         ${emailButton(`${siteUrl}/app/shopping`, "View shopping →")}`
      ),
    });
    if (!error) sent++;
  }

  return NextResponse.json({ tenantsWithSpend: totals.size, emailsSent: sent });
}
