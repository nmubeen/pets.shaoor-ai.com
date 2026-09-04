"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseScopeOptional } from "@/lib/scope";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function revalidateTasks() {
  revalidatePath("/app");
  revalidatePath("/app/shopping");
}

export async function addCareTask(tenantId: string, formData: FormData) {
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
    ...parseScopeOptional(str(formData, "scope")),
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
