// Powers the Health quick-links shown on each pet's card at /app/pets —
// one link per Health sub-section (Visits, Illnesses, Vaccinations,
// Medications, Growth), shown with a count badge only when that pet
// actually has something logged there. Growth reuses visits' own
// weight_kg column (same source lib/growth.ts's getWeightHistory reads)
// rather than a separate table.
import "server-only";
import type { createClient } from "@/lib/supabase/server";

/** How many records this pet has in each Health sub-section — 0 means the link isn't shown at all (see components/pets/PetHealthLinks.tsx). */
export type PetLinks = {
  visits: number;
  illnesses: number;
  vaccinations: number;
  medications: number;
  growth: number;
};

const EMPTY: PetLinks = { visits: 0, illnesses: 0, vaccinations: 0, medications: 0, growth: 0 };

export async function getPetLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<Map<string, PetLinks>> {
  const [{ data: visits }, { data: illnesses }, { data: vaccinations }, { data: medications }] = await Promise.all([
    supabase.from("visits").select("pet_id, weight_kg").eq("tenant_id", tenantId),
    supabase.from("illnesses").select("pet_id").eq("tenant_id", tenantId),
    supabase.from("vaccinations").select("pet_id").eq("tenant_id", tenantId),
    supabase.from("medications").select("pet_id").eq("tenant_id", tenantId),
  ]);

  const links = new Map<string, PetLinks>();
  function forPet(petId: string): PetLinks {
    const existing = links.get(petId);
    if (existing) return existing;
    const fresh = { ...EMPTY };
    links.set(petId, fresh);
    return fresh;
  }

  for (const v of visits ?? []) {
    const l = forPet(v.pet_id);
    l.visits += 1;
    if (v.weight_kg !== null) l.growth += 1;
  }
  for (const i of illnesses ?? []) forPet(i.pet_id).illnesses += 1;
  for (const v of vaccinations ?? []) forPet(v.pet_id).vaccinations += 1;
  for (const m of medications ?? []) forPet(m.pet_id).medications += 1;

  return links;
}
