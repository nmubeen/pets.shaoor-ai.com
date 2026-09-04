"use server";

// Server Actions for adding pets, groups, and habitats. RLS
// (menagerie.can_write_tenant) is the actual authorization boundary here —
// tenantId is only a routing hint, not a trust decision.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

export async function addPet(tenantId: string, formData: FormData) {
  const name = str(formData, "name");
  const species = str(formData, "species");
  if (!name || !species) return { error: "Name and species are required." };

  const supabase = await createClient();
  const { error } = await supabase.from("pets").insert({
    tenant_id: tenantId,
    name,
    species,
    life_stage: str(formData, "life_stage"),
  });
  if (error) return { error: error.message };

  revalidatePath("/app");
  revalidatePath("/app/pets");
  revalidatePath("/onboarding/pets");
  return { error: null };
}

export async function addGroup(tenantId: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("pet_groups").insert({
    tenant_id: tenantId,
    name,
    species: str(formData, "species"),
  });
  if (error) return { error: error.message };

  revalidatePath("/app");
  revalidatePath("/app/pets");
  revalidatePath("/onboarding/pets");
  return { error: null };
}

export async function addHabitat(tenantId: string, formData: FormData) {
  const name = str(formData, "name");
  const habitatType = str(formData, "habitat_type");
  if (!name || !habitatType) return { error: "Name and type are required." };

  const supabase = await createClient();
  const { error } = await supabase.from("habitats").insert({
    tenant_id: tenantId,
    name,
    habitat_type: habitatType,
    capacity_note: str(formData, "capacity_note"),
  });
  if (error) return { error: error.message };

  revalidatePath("/app");
  revalidatePath("/app/pets");
  revalidatePath("/onboarding/pets");
  return { error: null };
}
