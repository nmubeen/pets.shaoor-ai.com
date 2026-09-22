// Powers /app/feeding — a recurring per-pet meal schedule (Breakfast 8am,
// Lunch 1pm, ...) plus a daily log of when each meal was actually given.
// Pet-only, same reasoning as medications/vaccinations (0017_scope_rework.sql).
import "server-only";
import type { createClient } from "@/lib/supabase/server";

export type FeedingScheduleRow = {
  id: string;
  petId: string;
  who: string;
  mealName: string;
  scheduledTime: string; // "HH:MM:SS"
  portion: string | null;
  active: boolean;
  /** Today's log entry for this schedule row, if it's already been marked fed today. */
  todayLog: { id: string; givenAt: string } | null;
};

export type FeedingLogRow = {
  id: string;
  scheduleId: string;
  petId: string;
  who: string;
  mealName: string;
  logDate: string;
  givenAt: string;
};

/** UTC-safe "today", matching the date convention every other due-date/cron comparison in this codebase already uses (see lib/actions/tasks.ts, app/api/cron/reminders). */
export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getFeedingSchedules(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<FeedingScheduleRow[]> {
  const today = todayDate();

  const [{ data: schedules }, { data: pets }, { data: todayLogs }] = await Promise.all([
    supabase
      .from("feeding_schedules")
      .select("id, pet_id, meal_name, scheduled_time, portion, active")
      .eq("tenant_id", tenantId)
      .order("scheduled_time"),
    supabase.from("pets").select("id, name").eq("tenant_id", tenantId),
    supabase
      .from("feeding_logs")
      .select("id, schedule_id, given_at")
      .eq("tenant_id", tenantId)
      .eq("log_date", today),
  ]);

  const byId = new Map((pets ?? []).map((p) => [p.id, p.name]));
  const logByScheduleId = new Map((todayLogs ?? []).map((l) => [l.schedule_id, l]));

  return (schedules ?? []).map((s) => {
    const log = logByScheduleId.get(s.id);
    return {
      id: s.id,
      petId: s.pet_id,
      who: byId.get(s.pet_id) ?? "Unknown",
      mealName: s.meal_name,
      scheduledTime: s.scheduled_time,
      portion: s.portion,
      active: s.active,
      todayLog: log ? { id: log.id, givenAt: log.given_at } : null,
    };
  });
}

const HISTORY_DAYS = 7;

/** Last 7 days of feeding history — matches what the daily cleanup cron retains, so nothing shown here is ever data the cron is about to delete out from under the page. */
export async function getFeedingLogHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<FeedingLogRow[]> {
  const cutoff = new Date(Date.now() - (HISTORY_DAYS - 1) * 86_400_000).toISOString().slice(0, 10);

  const [{ data: logs }, { data: schedules }, { data: pets }] = await Promise.all([
    supabase
      .from("feeding_logs")
      .select("id, schedule_id, log_date, given_at")
      .eq("tenant_id", tenantId)
      .gte("log_date", cutoff)
      .order("log_date", { ascending: false })
      .order("given_at", { ascending: false }),
    supabase.from("feeding_schedules").select("id, pet_id, meal_name").eq("tenant_id", tenantId),
    supabase.from("pets").select("id, name").eq("tenant_id", tenantId),
  ]);

  const scheduleById = new Map((schedules ?? []).map((s) => [s.id, s]));
  const petNameById = new Map((pets ?? []).map((p) => [p.id, p.name]));

  return (logs ?? []).flatMap((l) => {
    const schedule = scheduleById.get(l.schedule_id);
    if (!schedule) return []; // schedule since deleted — nothing sensible to show
    return [
      {
        id: l.id,
        scheduleId: l.schedule_id,
        petId: schedule.pet_id,
        who: petNameById.get(schedule.pet_id) ?? "Unknown",
        mealName: schedule.meal_name,
        logDate: l.log_date,
        givenAt: l.given_at,
      },
    ];
  });
}
