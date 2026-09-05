// Powers each habitat's Care panel (/app/habitats) — feed, cleaning, water
// change, or anything else logged against it. Deliberately reuses the
// existing care_tasks table (lib/tasks.ts's dashboard-wide "Care tasks"
// widget already scopes it to a pet or habitat) rather than a new table:
// a habitat routine is exactly a recurring task that gets "done" and
// rescheduled, which care_tasks already models — see lib/actions/tasks.ts's
// logHabitatCare for the one-click "log it now" action built on top of it.
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { HabitatCare } from "@/lib/habitat-care-shared";

export type { HabitatCare, HabitatCareRow } from "@/lib/habitat-care-shared";
export { HABITAT_CARE_PRESETS } from "@/lib/habitat-care-shared";

const HISTORY_LIMIT = 10;

function dueLabelFor(dueDate: string | null): { label: string; overdue: boolean } {
  if (!dueDate) return { label: "No due date", overdue: false };
  const days = Math.ceil((new Date(dueDate + "T00:00:00").getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `${-days}d overdue`, overdue: true };
  if (days === 0) return { label: "Due today", overdue: true };
  return { label: `Due in ${days}d`, overdue: false };
}

/**
 * Every care_tasks row scoped to a habitat, split into open/history and
 * grouped per habitat — one query for every habitat card on the page
 * rather than one round trip per card (same pattern as lib/pet-links.ts's
 * getPetLinks).
 */
export async function getHabitatCareByHabitat(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<Map<string, HabitatCare>> {
  const { data } = await supabase
    .from("care_tasks")
    .select("id, habitat_id, title, due_date, repeat_interval_days, completed_at")
    .eq("tenant_id", tenantId)
    .not("habitat_id", "is", null);

  const openByHabitat = new Map<string, NonNullable<typeof data>>();
  const historyByHabitat = new Map<string, NonNullable<typeof data>>();
  for (const t of data ?? []) {
    if (!t.habitat_id) continue;
    const map = t.completed_at ? historyByHabitat : openByHabitat;
    const list = map.get(t.habitat_id) ?? [];
    list.push(t);
    map.set(t.habitat_id, list);
  }

  const result = new Map<string, HabitatCare>();
  const habitatIds = new Set([...openByHabitat.keys(), ...historyByHabitat.keys()]);
  for (const id of habitatIds) {
    const open = (openByHabitat.get(id) ?? [])
      .slice()
      .sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"))
      .map((t) => {
        const { label, overdue } = dueLabelFor(t.due_date);
        return {
          id: t.id,
          title: t.title,
          dueDate: t.due_date,
          dueLabel: label,
          overdue,
          repeatIntervalDays: t.repeat_interval_days,
          completedDate: null,
        };
      });

    const history = (historyByHabitat.get(id) ?? [])
      .slice()
      .sort((a, b) => (b.completed_at as string).localeCompare(a.completed_at as string))
      .slice(0, HISTORY_LIMIT)
      .map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.due_date,
        dueLabel: "",
        overdue: false,
        repeatIntervalDays: t.repeat_interval_days,
        completedDate: formatDate(new Date(t.completed_at as string)),
      }));

    result.set(id, { open, history });
  }

  return result;
}
