"use server";

// Server Actions for adding/editing pets, groups, and habitats. RLS
// (menagerie.can_write_tenant) is the actual authorization boundary here —
// tenantId is only a routing hint, not a trust decision.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadImage, removeImage } from "@/lib/storage";
import type { PetSex, SpeciesGroup } from "@/lib/database.types";

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

function speciesGroup(formData: FormData): SpeciesGroup | null {
  const v = str(formData, "species_group");
  return v && SPECIES_GROUPS.includes(v as SpeciesGroup) ? (v as SpeciesGroup) : null;
}

function petFields(formData: FormData) {
  return {
    breed: str(formData, "breed"),
    sex: sex(formData),
    species_group: speciesGroup(formData),
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

/**
 * Reads the optional "photo" file field a roster form may include, plus a
 * "remove_photo" checkbox for edit forms. `currentPath` is the item's
 * existing photo (null for a brand-new item) — replacing or removing
 * cleans up the old Storage object. Returns a partial to spread into the
 * insert/update payload: {} means "no change to the photo".
 */
async function resolvePhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  formData: FormData,
  currentPath: string | null
): Promise<{ photo_path?: string | null } | { error: string }> {
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const { path, error } = await uploadImage(supabase, tenantId, "avatars", file);
    if (error || !path) return { error: error ?? "Photo upload failed." };
    await removeImage(supabase, currentPath);
    return { photo_path: path };
  }
  if (str(formData, "remove_photo") === "on" && currentPath) {
    await removeImage(supabase, currentPath);
    return { photo_path: null };
  }
  return {};
}

export async function addPet(tenantId: string, formData: FormData) {
  const name = str(formData, "name");
  const species = str(formData, "species");
  if (!name || !species) return { error: "Name and species are required." };

  const supabase = await createClient();
  const photo = await resolvePhoto(supabase, tenantId, formData, null);
  if ("error" in photo) return photo;

  const { error } = await supabase.from("pets").insert({
    tenant_id: tenantId,
    name,
    species,
    ...petFields(formData),
    ...photo,
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
  const photo = await resolvePhoto(supabase, tenantId, formData, str(formData, "current_photo_path"));
  if ("error" in photo) return photo;

  const { error } = await supabase
    .from("pets")
    .update({ name, species, ...petFields(formData), ...photo })
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
  const photo = await resolvePhoto(supabase, tenantId, formData, null);
  if ("error" in photo) return photo;

  const { error } = await supabase.from("pet_groups").insert({
    tenant_id: tenantId,
    name,
    species: str(formData, "species"),
    ...photo,
  });
  if (error) return { error: error.message };

  revalidateRoster();
  return { error: null };
}

export async function updateGroup(tenantId: string, groupId: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const photo = await resolvePhoto(supabase, tenantId, formData, str(formData, "current_photo_path"));
  if ("error" in photo) return photo;

  const { error } = await supabase
    .from("pet_groups")
    .update({ name, species: str(formData, "species"), ...photo })
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
  const photo = await resolvePhoto(supabase, tenantId, formData, null);
  if ("error" in photo) return photo;

  const { error } = await supabase.from("habitats").insert({
    tenant_id: tenantId,
    name,
    habitat_type: habitatType,
    capacity_note: str(formData, "capacity_note"),
    ...photo,
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
  const photo = await resolvePhoto(supabase, tenantId, formData, str(formData, "current_photo_path"));
  if ("error" in photo) return photo;

  const { error } = await supabase
    .from("habitats")
    .update({ name, habitat_type: habitatType, capacity_note: str(formData, "capacity_note"), ...photo })
    .eq("id", habitatId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidateRoster();
  return { error: null };
}
