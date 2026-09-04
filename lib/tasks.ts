import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getRoster } from "@/lib/roster";
import { pickScopeId } from "@/lib/scope";

export type CareTaskRow = {
  id: string;
  title: string;
  who: string;
  dueDate: string | null;
  dueLabel: string;
  overdue: boolean;
  repeatIntervalDays: number | null;
};

function dueLabelFor(dueDate: string | null): { label: string; overdue: boolean } {
  if (!dueDate) return { label: "No due date", overdue: false };
  const days = Math.ceil((new Date(dueDate + "T00:00:00").getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `${-days}d overdue`, overdue: true };
  if (days === 0) return { label: "Due today", overdue: true };
  return { label: `Due in ${days}d`, overdue: false };
}

/** Open (not-yet-completed) care tasks, soonest due first. */
export async function getOpenCareTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<CareTaskRow[]> {
  const [{ data }, roster] = await Promise.all([
    supabase
      .from("care_tasks")
      .select("id, pet_id, habitat_id, title, due_date, repeat_interval_days")
      .eq("tenant_id", tenantId)
      .is("completed_at", null)
      .order("due_date", { ascending: true, nullsFirst: false }),
    getRoster(supabase, tenantId),
  ]);

  const byId = new Map(roster.map((r) => [r.id, r.name]));

  return (data ?? []).map((t) => {
    // Always exactly one of pet_id/habitat_id — care_tasks dropped the
    // "household" option (0017_scope_rework.sql), so pickScopeId always
    // resolves to something.
    const scopeId = pickScopeId(t);
    const { label, overdue } = dueLabelFor(t.due_date);
    return {
      id: t.id,
      title: t.title,
      who: byId.get(scopeId ?? "") ?? "Unknown",
      dueDate: t.due_date,
      dueLabel: label,
      overdue,
      repeatIntervalDays: t.repeat_interval_days,
    };
  });
}
