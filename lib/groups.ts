// Fetches groups for /app/pets — a group is a saved, named collection of 2+
// existing pets (e.g. "Adult cats", "Kittens"); a pet can belong to any
// number of groups. See supabase/migrations/0015_groups_redesign.sql and
// lib/actions/groups.ts.
import "server-only";
import type { createClient } from "@/lib/supabase/server";

export type GroupMember = { id: string; name: string; species: string };

export type Group = {
  id: string;
  name: string;
  photoPath: string | null;
  photoUrl: string | null;
  initials: string;
  color: string;
  members: GroupMember[];
};

const COLORS = ["var(--primary)", "var(--org)", "var(--good)", "var(--trial)", "var(--coral)", "var(--accent)"];
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export async function getGroups(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<Group[]> {
  const [{ data: groups }, { data: memberships }] = await Promise.all([
    supabase.from("pet_groups").select("id,name,photo_path,created_at").eq("tenant_id", tenantId).order("created_at"),
    supabase
      .from("pet_group_members")
      .select("group_id, pets(id, name, species)")
      .eq("tenant_id", tenantId),
  ]);

  const membersByGroup = new Map<string, GroupMember[]>();
  for (const row of memberships ?? []) {
    const pet = row.pets as unknown as GroupMember | null;
    if (!pet) continue;
    const list = membersByGroup.get(row.group_id) ?? [];
    list.push({ id: pet.id, name: pet.name, species: pet.species });
    membersByGroup.set(row.group_id, list);
  }

  const rows = groups ?? [];
  const paths = rows.map((g) => g.photo_path).filter((p): p is string => p !== null);
  const { data: signed } = paths.length
    ? await supabase.storage.from("media").createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
    : { data: [] as { path: string | null; signedUrl: string | null }[] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return rows.map((g, i) => ({
    id: g.id,
    name: g.name,
    photoPath: g.photo_path,
    photoUrl: g.photo_path ? (urlByPath.get(g.photo_path) ?? null) : null,
    initials: initialsFor(g.name),
    color: COLORS[i % COLORS.length],
    members: (membersByGroup.get(g.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
