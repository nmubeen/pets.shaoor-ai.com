// Merges pets, pet_groups, and habitats into one "roster" list for the
// dashboard and /app/pets — they're peers in the schema (§03) but three
// separate tables, so the merge happens here rather than as a DB view.
import "server-only";
import type { createClient } from "@/lib/supabase/server";

export type RosterItem = {
  id: string;
  kind: "pet" | "group" | "habitat";
  name: string;
  subtitle: string;
  initials: string;
  color: string;
  createdAt: string;
  // Adoption profile fields — only ever set for kind: "pet" (§02, org tier).
  isAdoptable: boolean;
  adoptionNote: string | null;
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

export async function getRoster(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<RosterItem[]> {
  const [pets, groups, habitats] = await Promise.all([
    supabase
      .from("pets")
      .select("id,name,species,life_stage,is_adoptable,adoption_note,created_at")
      .eq("tenant_id", tenantId),
    supabase.from("pet_groups").select("id,name,species,created_at").eq("tenant_id", tenantId),
    supabase
      .from("habitats")
      .select("id,name,habitat_type,capacity_note,created_at")
      .eq("tenant_id", tenantId),
  ]);

  const items: Omit<RosterItem, "color">[] = [
    ...(pets.data ?? []).map((p) => ({
      id: p.id,
      kind: "pet" as const,
      name: p.name,
      subtitle: [p.species, p.life_stage].filter(Boolean).join(" · "),
      initials: initialsFor(p.name),
      createdAt: p.created_at,
      isAdoptable: p.is_adoptable,
      adoptionNote: p.adoption_note,
    })),
    ...(groups.data ?? []).map((g) => ({
      id: g.id,
      kind: "group" as const,
      name: g.name,
      subtitle: [g.species, "Group"].filter(Boolean).join(" · "),
      initials: initialsFor(g.name),
      createdAt: g.created_at,
      isAdoptable: false,
      adoptionNote: null,
    })),
    ...(habitats.data ?? []).map((h) => ({
      id: h.id,
      kind: "habitat" as const,
      name: h.name,
      subtitle: ["Habitat", h.habitat_type, h.capacity_note].filter(Boolean).join(" · "),
      initials: initialsFor(h.name),
      createdAt: h.created_at,
      isAdoptable: false,
      adoptionNote: null,
    })),
  ];

  items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return items.map((item, i) => ({ ...item, color: COLORS[i % COLORS.length] }));
}
