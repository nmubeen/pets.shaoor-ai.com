"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SpeciesGroup } from "@/lib/database.types";

const SPECIES_GROUPS: SpeciesGroup[] = ["dog", "cat", "bird", "reptile", "fish", "small_mammal", "other"];

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function num(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function revalidate() {
  revalidatePath("/app/settings/care");
  revalidatePath("/app/health");
}

function planFields(formData: FormData) {
  return {
    vaccine_name: str(formData, "vaccine_name"),
    age_weeks_due: num(formData, "age_weeks_due"),
    booster_interval_months: num(formData, "booster_interval_months"),
    notes: str(formData, "notes"),
  };
}

/** Only ever creates a tenant-owned row — the built-in defaults (tenant_id null) aren't reachable through this. */
export async function addVaccinationPlan(tenantId: string, formData: FormData) {
  const speciesGroup = str(formData, "species_group");
  if (!speciesGroup || !SPECIES_GROUPS.includes(speciesGroup as SpeciesGroup)) return { error: "Choose a species." };
  const fields = planFields(formData);
  if (!fields.vaccine_name) return { error: "Vaccine name is required." };
  if (fields.age_weeks_due === null) return { error: "Age when due (in weeks) is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("vaccine_protocols").insert({
    tenant_id: tenantId,
    species_group: speciesGroup as SpeciesGroup,
    dose_sequence: 1,
    is_core: true,
    vaccine_name: fields.vaccine_name,
    age_weeks_due: fields.age_weeks_due,
    booster_interval_months: fields.booster_interval_months,
    notes: fields.notes,
  });
  if (error) return { error: error.message };

  revalidate();
  return { error: null };
}

/** RLS backs this up too — the update policy requires tenant_id is not null, so a built-in row can't be edited even if someone passed its id. */
export async function updateVaccinationPlan(tenantId: string, planId: string, formData: FormData) {
  const fields = planFields(formData);
  if (!fields.vaccine_name) return { error: "Vaccine name is required." };
  if (fields.age_weeks_due === null) return { error: "Age when due (in weeks) is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("vaccine_protocols")
    .update({
      vaccine_name: fields.vaccine_name,
      age_weeks_due: fields.age_weeks_due,
      booster_interval_months: fields.booster_interval_months,
      notes: fields.notes,
    })
    .eq("id", planId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidate();
  return { error: null };
}

export async function deleteVaccinationPlan(tenantId: string, planId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("vaccine_protocols").delete().eq("id", planId).eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidate();
  return { error: null };
}
