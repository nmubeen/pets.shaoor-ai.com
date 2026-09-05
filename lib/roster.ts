// Merges pets and habitats into one "roster" list for the dashboard and
// /app/pets — they're peers in the schema (§03) but two separate tables, so
// the merge happens here rather than as a DB view. There is no third
// "group" kind — groups (a saved collection of pets) existed briefly and
// were removed.
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { PetSex, Species } from "@/lib/database.types";
import { SPECIES_LABEL } from "@/lib/species-labels";
import { SEX_LABEL, ageLabel } from "@/lib/pet-labels";

/** Fields that only ever apply to kind: "pet" — null for habitats. */
export type PetDetails = {
  species: Species;
  breed: string;
  sex: PetSex;
  birthDate: string | null;
  lifeStage: string | null;
  weightKg: number | null;
  color: string | null;
  microchipId: string | null;
  neutered: boolean | null;
  notes: string | null;
  isAdoptable: boolean;
  adoptionNote: string | null;
};

export type RosterItem = {
  id: string;
  kind: "pet" | "habitat";
  name: string;
  subtitle: string;
  initials: string;
  color: string;
  createdAt: string;
  habitatType: string | null; // habitat
  capacityNote: string | null; // habitat
  photoPath: string | null; // raw storage path — for the edit form to replace/remove
  photoUrl: string | null; // signed URL — for display
  pet: PetDetails | null; // pet only — species/breed live here, not top-level
};

const COLORS = [
  "var(--accent)",
  "var(--coral)",
  "var(--trial)",
  "var(--good)",
  "var(--org)",
  "var(--primary)",
];

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function petSubtitle(species: Species, breed: string, sex: PetSex, birthDate: string | null, lifeStage: string | null) {
  return [breed, SPECIES_LABEL[species], SEX_LABEL[sex], ageLabel(birthDate) ?? lifeStage].filter(Boolean).join(" · ");
}

export async function getRoster(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<RosterItem[]> {
  const [pets, habitats] = await Promise.all([
    supabase
      .from("pets")
      .select(
        "id,name,species,breed,sex,birth_date,life_stage,weight_kg,color,microchip_id,neutered,notes,is_adoptable,adoption_note,photo_path,created_at"
      )
      .eq("tenant_id", tenantId),
    supabase
      .from("habitats")
      .select("id,name,habitat_type,capacity_note,photo_path,created_at")
      .eq("tenant_id", tenantId),
  ]);

  const items: Omit<RosterItem, "color" | "photoUrl">[] = [
    ...(pets.data ?? []).map((p) => {
      const sex = p.sex ?? "unknown";
      return {
        id: p.id,
        kind: "pet" as const,
        name: p.name,
        subtitle: petSubtitle(p.species, p.breed, sex, p.birth_date, p.life_stage),
        initials: initialsFor(p.name),
        createdAt: p.created_at,
        habitatType: null,
        capacityNote: null,
        photoPath: p.photo_path,
        pet: {
          species: p.species,
          breed: p.breed,
          sex,
          birthDate: p.birth_date,
          lifeStage: p.life_stage,
          weightKg: p.weight_kg,
          color: p.color,
          microchipId: p.microchip_id,
          neutered: p.neutered,
          notes: p.notes,
          isAdoptable: p.is_adoptable,
          adoptionNote: p.adoption_note,
        },
      };
    }),
    ...(habitats.data ?? []).map((h) => ({
      id: h.id,
      kind: "habitat" as const,
      name: h.name,
      subtitle: ["Habitat", h.habitat_type, h.capacity_note].filter(Boolean).join(" · "),
      initials: initialsFor(h.name),
      createdAt: h.created_at,
      habitatType: h.habitat_type,
      capacityNote: h.capacity_note,
      photoPath: h.photo_path,
      pet: null,
    })),
  ];

  items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const paths = items.map((i) => i.photoPath).filter((p): p is string => p !== null);
  const { data: signed } = paths.length
    ? await supabase.storage.from("media").createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
    : { data: [] as { path: string | null; signedUrl: string | null }[] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return items.map((item, i) => ({
    ...item,
    color: COLORS[i % COLORS.length],
    photoUrl: item.photoPath ? (urlByPath.get(item.photoPath) ?? null) : null,
  }));
}
