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
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Blank option means "applies to any species" (null) — same tri-state pattern as roster.ts's speciesGroup parser. */
function speciesGroup(formData: FormData): SpeciesGroup | null {
  const v = str(formData, "species_group");
  return v && SPECIES_GROUPS.includes(v as SpeciesGroup) ? (v as SpeciesGroup) : null;
}

function revalidate() {
  revalidatePath("/app/settings/care");
  revalidatePath("/app/health");
}

export async function addServiceType(tenantId: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("care_service_types").insert({
    tenant_id: tenantId,
    name,
    frequency_days: num(formData, "frequency_days"),
    species_group: speciesGroup(formData),
  });
  if (error) {
    if (error.code === "23505") return { error: "A service with that name (for that species) already exists." };
    return { error: error.message };
  }

  revalidate();
  return { error: null };
}

export async function updateServiceType(tenantId: string, serviceTypeId: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("care_service_types")
    .update({ name, frequency_days: num(formData, "frequency_days"), species_group: speciesGroup(formData) })
    .eq("id", serviceTypeId)
    .eq("tenant_id", tenantId);
  if (error) {
    if (error.code === "23505") return { error: "A service with that name (for that species) already exists." };
    return { error: error.message };
  }

  revalidate();
  return { error: null };
}

export async function deleteServiceType(tenantId: string, serviceTypeId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("care_service_types")
    .delete()
    .eq("id", serviceTypeId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidate();
  return { error: null };
}
