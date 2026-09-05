// Powers the Health quick-links shown on each pet's card at /app/pets —
// one bullet per Health sub-section (Visits, Illnesses, Vaccinations,
// Medications, Growth), shown only when that pet actually has something
// logged there. Growth reuses visits' own weight_kg column (same source
// lib/growth.ts's getWeightHistory reads) rather than a separate table.
import "server-only";
import type { createClient } from "@/lib/supabase/server";

export type PetLinks = {
  visits: boolean;
  illnesses: boolean;
  vaccinations: boolean;
  medications: boolean;
  growth: boolean;
};

const EMPTY: PetLinks = { visits: false, illnesses: false, vaccinations: false, medications: false, growth: false };

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
    l.visits = true;
    if (v.weight_kg !== null) l.growth = true;
  }
  for (const i of illnesses ?? []) forPet(i.pet_id).illnesses = true;
  for (const v of vaccinations ?? []) forPet(v.pet_id).vaccinations = true;
  for (const m of medications ?? []) forPet(m.pet_id).medications = true;

  return links;
}
