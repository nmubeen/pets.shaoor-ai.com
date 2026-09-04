import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoster } from "@/lib/roster";
import { sendEmail } from "@/lib/email";
import { emailShell, emailButton } from "@/lib/email-templates";

// The "nightly vaccination/reminder digest" from §06 of the design doc —
// same shape as /api/cron/trial-expiry: Vercel Cron hits this, auth'd the
// same way via CRON_SECRET. Emails the owner only (matches how billing-
// related notices are scoped elsewhere) — not every active member.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const horizon = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pets.shaoor-ai.com";

  const [{ data: dueVax }, { data: dueTasks }] = await Promise.all([
    supabase
      .from("vaccinations")
      .select("id, tenant_id, pet_id, reason, status, due_date")
      .neq("status", "complete")
      .not("due_date", "is", null)
      .lte("due_date", horizon),
    supabase
      .from("care_tasks")
      .select("id, tenant_id, pet_id, habitat_id, title, due_date")
      .is("completed_at", null)
      .not("due_date", "is", null)
      .lte("due_date", horizon),
  ]);

  const tenantIds = [
    ...new Set([...(dueVax ?? []).map((v) => v.tenant_id), ...(dueTasks ?? []).map((t) => t.tenant_id)]),
  ];

  let sent = 0;
  for (const tenantId of tenantIds) {
    const vaxRows = (dueVax ?? []).filter((v) => v.tenant_id === tenantId);
    const taskRows = (dueTasks ?? []).filter((t) => t.tenant_id === tenantId);
    if (vaxRows.length === 0 && taskRows.length === 0) continue;

    const [{ data: tenant }, { data: owner }, roster] = await Promise.all([
      supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
      supabase
        .from("memberships")
        .select("invited_email")
        .eq("tenant_id", tenantId)
        .eq("role", "owner")
        .eq("status", "active")
        .maybeSingle(),
      getRoster(supabase, tenantId),
    ]);
    if (!owner?.invited_email) continue;

    const byId = new Map(roster.map((r) => [r.id, r.name]));
    // Vaccinations are pet-only (0017_scope_rework.sql); care_tasks still
    // have both pet_id and habitat_id (exactly one set).
    const whoVax = (v: { pet_id: string }) => byId.get(v.pet_id) ?? "Unknown";
    const whoTask = (t: { pet_id: string | null; habitat_id: string | null }) =>
      byId.get(t.pet_id ?? t.habitat_id ?? "") ?? "Unknown";

    const items = [
      ...vaxRows.map((v) => `<li>💉 <strong>${whoVax(v)}</strong> — ${v.reason} (due ${v.due_date})</li>`),
      ...taskRows.map((t) => `<li>📋 <strong>${whoTask(t)}</strong> — ${t.title} (due ${t.due_date})</li>`),
    ].join("");
    const count = vaxRows.length + taskRows.length;

    const { error } = await sendEmail({
      to: owner.invited_email,
      subject: `${count} thing${count === 1 ? "" : "s"} due soon in ${tenant?.name ?? "your workspace"}`,
      html: emailShell(
        "Upcoming care reminders",
        `<p>Here's what's due in the next 7 days for <strong>${tenant?.name ?? "your workspace"}</strong>:</p>
         <ul style="padding-left:20px; margin:12px 0;">${items}</ul>
         ${emailButton(`${siteUrl}/app`, "Open Menagerie →")}`
      ),
    });
    if (!error) sent++;
  }

  return NextResponse.json({ tenantsWithReminders: tenantIds.length, emailsSent: sent });
}
