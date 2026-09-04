"use server";

// Server Actions for adding/editing pets, groups, and habitats. RLS
// (menagerie.can_write_tenant) is the actual authorization boundary here —
// tenantId is only a routing hint, not a trust decision.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PetSex } from "@/lib/database.types";

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

function sex(formData: FormData): PetSex {
  const v = str(formData, "sex");
  return v === "male" || v === "female" ? v : "unknown";
}

/** Tri-state select ("unknown" | "yes" | "no") -> boolean | null. */
function triBool(formData: FormData, key: string): boolean | null {
  const v = str(formData, key);
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

function petFields(formData: FormData) {
  return {
    breed: str(formData, "breed"),
    sex: sex(formData),
    birth_date: str(formData, "birth_date"),
    life_stage: str(formData, "life_stage"),
    weight_kg: num(formData, "weight_kg"),
    color: str(formData, "color"),
    microchip_id: str(formData, "microchip_id"),
    neutered: triBool(formData, "neutered"),
    notes: str(formData, "notes"),
  };
}

function revalidateRoster() {
  revalidatePath("/app");
  revalidatePath("/app/pets");
  revalidatePath("/onboarding/pets");
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
    ...petFields(formData),
  });
  if (error) return { error: error.message };

  revalidateRoster();
  return { error: null };
}

export async function updatePet(tenantId: string, petId: string, formData: FormData) {
  const name = str(formData, "name");
  const species = str(formData, "species");
  if (!name || !species) return { error: "Name and species are required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("pets")
    .update({ name, species, ...petFields(formData) })
    .eq("id", petId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidateRoster();
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

  revalidateRoster();
  return { error: null };
}

export async function updateGroup(tenantId: string, groupId: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("pet_groups")
    .update({ name, species: str(formData, "species") })
    .eq("id", groupId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidateRoster();
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

  revalidateRoster();
  return { error: null };
}

export async function updateHabitat(tenantId: string, habitatId: string, formData: FormData) {
  const name = str(formData, "name");
  const habitatType = str(formData, "habitat_type");
  if (!name || !habitatType) return { error: "Name and type are required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("habitats")
    .update({ name, habitat_type: habitatType, capacity_note: str(formData, "capacity_note") })
    .eq("id", habitatId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidateRoster();
  return { error: null };
}
