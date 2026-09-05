"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseScopeRequired } from "@/lib/scope";
import { HABITAT_CARE_PRESETS } from "@/lib/habitat-care-shared";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function revalidateTasks() {
  revalidatePath("/app");
  revalidatePath("/app/shopping");
  revalidatePath("/app/habitats");
}

export async function addCareTask(tenantId: string, formData: FormData) {
  const s = parseScopeRequired(str(formData, "scope"));
  if ("error" in s) return s;
  const title = str(formData, "title");
  if (!title) return { error: "Title is required." };

  const repeatRaw = str(formData, "repeat_interval_days");
  const repeatIntervalDays = repeatRaw ? Number(repeatRaw) : null;

  const supabase = await createClient();
  const { error } = await supabase.from("care_tasks").insert({
    tenant_id: tenantId,
    title,
    due_date: str(formData, "due_date"),
    repeat_interval_days: repeatIntervalDays && repeatIntervalDays > 0 ? repeatIntervalDays : null,
    notes: str(formData, "notes"),
    ...s,
  });
  if (error) return { error: error.message };

  revalidateTasks();
  return { error: null };
}

/**
 * Marks a task done. If it repeats, immediately schedules the next
 * occurrence (due_date + repeat_interval_days) rather than leaving
 * "recurring care" as a one-off — matches the roadmap's phrasing (§13).
 */
export async function completeCareTask(tenantId: string, taskId: string) {
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("care_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!task) return { error: "Task not found." };

  const { error: updateError } = await supabase
    .from("care_tasks")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("tenant_id", tenantId);
  if (updateError) return { error: updateError.message };

  if (task.repeat_interval_days) {
    // UTC-safe: parsing/advancing/formatting all stay in UTC, so the next
    // due date doesn't shift by a day depending on the server's local
    // timezone (mixing local Date methods with toISOString() would).
    const base = task.due_date ? new Date(task.due_date + "T00:00:00Z") : new Date();
    base.setUTCDate(base.getUTCDate() + task.repeat_interval_days);
    const { error: insertError } = await supabase.from("care_tasks").insert({
      tenant_id: tenantId,
      title: task.title,
      due_date: base.toISOString().slice(0, 10),
      repeat_interval_days: task.repeat_interval_days,
      notes: task.notes,
      pet_id: task.pet_id,
      habitat_id: task.habitat_id,
    });
    if (insertError) return { error: insertError.message };
  }

  revalidateTasks();
  return { error: null };
}

/** Removes a care task entirely — for a mistaken entry, not for tidying up real history (see deleteCareTask's guard-free simplicity: nothing else in the app treats a completed care_tasks row as a source of truth, unlike a visit-linked health record, so no visit_id-style delete guard is needed here). */
export async function deleteCareTask(tenantId: string, taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("care_tasks").delete().eq("id", taskId).eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidateTasks();
  return { error: null };
}

/**
 * One-click "log it now" for a habitat's Care panel — Feed, Clean
 * enclosure, Water change, or any custom title. Matches an already-open
 * task with the same title (case-insensitive) and completes it via the
 * same reschedule logic as completeCareTask; otherwise records this as a
 * brand-new, already-done entry and, for a known preset, immediately
 * schedules the next occurrence at its default cadence — so the very
 * first click on "Feed" both logs today's feeding and sets up tomorrow's
 * reminder, matching completeCareTask's own "complete now, reschedule
 * next" shape rather than requiring an explicit setup step first.
 */
export async function logHabitatCare(tenantId: string, habitatId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return { error: "Title is required." };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("care_tasks")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("habitat_id", habitatId)
    .ilike("title", trimmed)
    .is("completed_at", null)
    .maybeSingle();

  if (existing) return completeCareTask(tenantId, existing.id);

  const preset = HABITAT_CARE_PRESETS.find((p) => p.title.toLowerCase() === trimmed.toLowerCase());
  const repeatIntervalDays = preset?.repeatIntervalDays ?? null;
  const today = new Date().toISOString().slice(0, 10);

  const { error: logError } = await supabase.from("care_tasks").insert({
    tenant_id: tenantId,
    habitat_id: habitatId,
    title: trimmed,
    due_date: today,
    completed_at: new Date().toISOString(),
    repeat_interval_days: repeatIntervalDays,
  });
  if (logError) return { error: logError.message };

  if (repeatIntervalDays) {
    const next = new Date(today + "T00:00:00Z");
    next.setUTCDate(next.getUTCDate() + repeatIntervalDays);
    const { error: insertError } = await supabase.from("care_tasks").insert({
      tenant_id: tenantId,
      habitat_id: habitatId,
      title: trimmed,
      due_date: next.toISOString().slice(0, 10),
      repeat_interval_days: repeatIntervalDays,
    });
    if (insertError) return { error: insertError.message };
  }

  revalidateTasks();
  return { error: null };
}
