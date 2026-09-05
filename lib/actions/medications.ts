"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function revalidateMedications() {
  revalidatePath("/app");
  revalidatePath("/app/health");
}

export async function addMedication(tenantId: string, formData: FormData) {
  const petId = str(formData, "pet_id");
  if (!petId) return { error: "Choose which pet this is about." };
  const name = str(formData, "name");
  if (!name) return { error: "Medication name is required." };

  const frequencyDays = Number(str(formData, "frequency_days") ?? "1");
  if (!Number.isFinite(frequencyDays) || frequencyDays < 1) {
    return { error: "Frequency must be at least 1 day." };
  }

  const startDate = str(formData, "start_date") ?? new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const { error } = await supabase.from("medications").insert({
    tenant_id: tenantId,
    pet_id: petId,
    provider_id: str(formData, "provider_id"),
    name,
    dosage: str(formData, "dosage"),
    frequency_days: frequencyDays,
    start_date: startDate,
    end_date: str(formData, "end_date"),
    next_due_date: startDate,
    notes: str(formData, "notes"),
  });
  if (error) return { error: error.message };

  revalidateMedications();
  return { error: null };
}

/**
 * Logs today's dose and advances next_due_date by frequency_days — same
 * UTC-safe reschedule pattern as lib/actions/tasks.ts's completeCareTask
 * and lib/actions/health.ts's markVaccinationGiven. If the medication has
 * an end_date and the next dose would fall after it, marks it completed
 * instead of scheduling a dose that was never meant to happen.
 */
export async function logMedicationDose(tenantId: string, medicationId: string) {
  const supabase = await createClient();

  const { data: med } = await supabase
    .from("medications")
    .select("frequency_days, end_date, next_due_date")
    .eq("id", medicationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!med) return { error: "Not found." };

  const next = new Date(med.next_due_date + "T00:00:00Z");
  next.setUTCDate(next.getUTCDate() + med.frequency_days);
  const nextDate = next.toISOString().slice(0, 10);

  const pastEnd = med.end_date && nextDate > med.end_date;
  const { error } = await supabase
    .from("medications")
    .update(pastEnd ? { status: "completed" } : { next_due_date: nextDate })
    .eq("id", medicationId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidateMedications();
  return { error: null };
}

export async function discontinueMedication(tenantId: string, medicationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("medications")
    .update({ status: "discontinued" })
    .eq("id", medicationId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidateMedications();
  return { error: null };
}

/**
 * Edits a medication's own details — name, dosage, frequency, dates,
 * provider, notes. Deliberately leaves next_due_date untouched: it's
 * independent dosing progress (advanced by logMedicationDose), not
 * something correcting a typo in the medication name should reset.
 */
export async function updateMedication(tenantId: string, medicationId: string, formData: FormData) {
  const petId = str(formData, "pet_id");
  if (!petId) return { error: "Choose which pet this is about." };
  const name = str(formData, "name");
  if (!name) return { error: "Medication name is required." };

  const frequencyDays = Number(str(formData, "frequency_days") ?? "1");
  if (!Number.isFinite(frequencyDays) || frequencyDays < 1) {
    return { error: "Frequency must be at least 1 day." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("medications")
    .update({
      pet_id: petId,
      provider_id: str(formData, "provider_id"),
      name,
      dosage: str(formData, "dosage"),
      frequency_days: frequencyDays,
      start_date: str(formData, "start_date") ?? new Date().toISOString().slice(0, 10),
      end_date: str(formData, "end_date"),
      notes: str(formData, "notes"),
    })
    .eq("id", medicationId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidateMedications();
  return { error: null };
}

/** Removes a medication entirely — distinct from discontinueMedication, which stops tracking it but keeps it visible in history until a status filter is added. */
export async function deleteMedication(tenantId: string, medicationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("medications").delete().eq("id", medicationId).eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidateMedications();
  return { error: null };
}
