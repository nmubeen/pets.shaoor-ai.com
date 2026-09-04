// Merges pets, pet_groups, and habitats into one "roster" list for the
// dashboard and /app/pets — they're peers in the schema (§03) but three
// separate tables, so the merge happens here rather than as a DB view.
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { PetSex } from "@/lib/database.types";

/** Fields that only ever apply to kind: "pet" — null for groups/habitats. */
export type PetDetails = {
  breed: string | null;
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
  kind: "pet" | "group" | "habitat";
  name: string;
  subtitle: string;
  initials: string;
  color: string;
  createdAt: string;
  species: string | null; // pet, group
  habitatType: string | null; // habitat
  capacityNote: string | null; // habitat
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
  const [pets, groups, habitats] = await Promise.all([
    supabase
      .from("pets")
      .select(
        "id,name,species,breed,sex,birth_date,life_stage,weight_kg,color,microchip_id,neutered,notes,is_adoptable,adoption_note,created_at"
      )
      .eq("tenant_id", tenantId),
    supabase.from("pet_groups").select("id,name,species,created_at").eq("tenant_id", tenantId),
    supabase
      .from("habitats")
      .select("id,name,habitat_type,capacity_note,created_at")
      .eq("tenant_id", tenantId),
  ]);

  const items: Omit<RosterItem, "color">[] = [
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
        pet: {
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
    ...(groups.data ?? []).map((g) => ({
      id: g.id,
      kind: "group" as const,
      name: g.name,
      subtitle: [g.species, "Group"].filter(Boolean).join(" · "),
      initials: initialsFor(g.name),
      createdAt: g.created_at,
      species: g.species,
      habitatType: null,
      capacityNote: null,
      pet: null,
    })),
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
      pet: null,
    })),
  ];

  items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return items.map((item, i) => ({ ...item, color: COLORS[i % COLORS.length] }));
}
