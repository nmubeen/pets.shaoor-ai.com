"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/errors";
import { parseTimeInput } from "@/lib/format";
import { todayDate } from "@/lib/feeding";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function revalidateFeeding() {
  revalidatePath("/app");
  revalidatePath("/app/feeding");
}

export async function addFeedingSchedule(tenantId: string, formData: FormData) {
  const petId = str(formData, "pet_id");
  if (!petId) return { error: "Choose which pet this is about." };
  const mealName = str(formData, "meal_name");
  if (!mealName) return { error: "Meal name is required." };
  const scheduledTimeRaw = str(formData, "scheduled_time");
  if (!scheduledTimeRaw) return { error: "Scheduled time is required." };
  const scheduledTime = parseTimeInput(scheduledTimeRaw);
  if (!scheduledTime) return { error: "Enter a time like 8:00 AM." };

  const supabase = await createClient();
  const { error } = await supabase.from("feeding_schedules").insert({
    tenant_id: tenantId,
    pet_id: petId,
    meal_name: mealName,
    scheduled_time: scheduledTime,
    portion: str(formData, "portion"),
  });
  if (error) return { error: friendlyErrorMessage(error) };

  revalidateFeeding();
  return { error: null };
}

export async function updateFeedingSchedule(tenantId: string, scheduleId: string, formData: FormData) {
  const petId = str(formData, "pet_id");
  if (!petId) return { error: "Choose which pet this is about." };
  const mealName = str(formData, "meal_name");
  if (!mealName) return { error: "Meal name is required." };
  const scheduledTimeRaw = str(formData, "scheduled_time");
  if (!scheduledTimeRaw) return { error: "Scheduled time is required." };
  const scheduledTime = parseTimeInput(scheduledTimeRaw);
  if (!scheduledTime) return { error: "Enter a time like 8:00 AM." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("feeding_schedules")
    .update({
      pet_id: petId,
      meal_name: mealName,
      scheduled_time: scheduledTime,
      portion: str(formData, "portion"),
    })
    .eq("id", scheduleId)
    .eq("tenant_id", tenantId);
  if (error) return { error: friendlyErrorMessage(error) };

  revalidateFeeding();
  return { error: null };
}

/** Deleting a schedule cascades its feeding_logs (on delete cascade) — there's no separate history to preserve once the schedule it belongs to is gone. */
export async function deleteFeedingSchedule(tenantId: string, scheduleId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("feeding_schedules").delete().eq("id", scheduleId).eq("tenant_id", tenantId);
  if (error) return { error: friendlyErrorMessage(error) };

  revalidateFeeding();
  return { error: null };
}

/**
 * Marks today's instance of a meal as given. Upserts on (schedule_id,
 * log_date) — clicking "Mark fed" again the same day (or editing the
 * time afterward) updates that one row instead of erroring on the unique
 * constraint or creating a duplicate.
 */
export async function logFeeding(tenantId: string, scheduleId: string, givenAt: string) {
  if (!givenAt) return { error: "A time is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("feeding_logs")
    .upsert(
      { tenant_id: tenantId, schedule_id: scheduleId, log_date: todayDate(), given_at: givenAt },
      { onConflict: "schedule_id,log_date" }
    );
  if (error) return { error: friendlyErrorMessage(error) };

  revalidateFeeding();
  return { error: null };
}

/** Undoes today's "mark fed" — for a mis-click, not for editing the time (logFeeding's upsert handles that). */
export async function deleteFeedingLog(tenantId: string, logId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("feeding_logs").delete().eq("id", logId).eq("tenant_id", tenantId);
  if (error) return { error: friendlyErrorMessage(error) };

  revalidateFeeding();
  return { error: null };
}
