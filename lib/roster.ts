// Merges pets and habitats into one "roster" list for the dashboard and
// /app/pets — they're peers in the schema (§03) but two separate tables, so
// the merge happens here rather than as a DB view. Groups are deliberately
// NOT part of the roster since the 0015 redesign: a group is a saved
// collection of existing pets (see lib/groups.ts), not a subject of its own
// that health/shopping/tasks/media can be scoped to.
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { PetSex, SpeciesGroup } from "@/lib/database.types";

/** Fields that only ever apply to kind: "pet" — null for habitats. */
export type PetDetails = {
  breed: string | null;
  sex: PetSex;
  speciesGroup: SpeciesGroup | null;
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
  species: string | null; // pet
  habitatType: string | null; // habitat
  capacityNote: string | null; // habitat
  photoPath: string | null; // raw storage path — for the edit form to replace/remove
  photoUrl: string | null; // signed URL — for display
  pet: PetDetails | null; // pet only
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

function ageLabel(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const months = Math.floor(
    (Date.now() - new Date(birthDate + "T00:00:00").getTime()) / (30.44 * 86_400_000)
  );
  if (months < 0) return null;
  if (months < 1) return "<1 mo";
  if (months < 24) return `${months} mo`;
  const years = Math.floor(months / 12);
  return `${years} yr${years === 1 ? "" : "s"}`;
}

const SEX_LABEL: Record<PetSex, string | null> = { male: "Male", female: "Female", unknown: null };

function petSubtitle(species: string, breed: string | null, sex: PetSex, birthDate: string | null, lifeStage: string | null) {
  const primary = breed ? `${breed} ${species}` : species;
  return [primary, SEX_LABEL[sex], ageLabel(birthDate) ?? lifeStage].filter(Boolean).join(" · ");
}

export async function getRoster(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<RosterItem[]> {
  const [pets, habitats] = await Promise.all([
    supabase
      .from("pets")
      .select(
        "id,name,species,breed,sex,species_group,birth_date,life_stage,weight_kg,color,microchip_id,neutered,notes,is_adoptable,adoption_note,photo_path,created_at"
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
        species: p.species,
        habitatType: null,
        capacityNote: null,
        photoPath: p.photo_path,
        pet: {
          breed: p.breed,
          sex,
          speciesGroup: p.species_group,
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
      species: null,
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
