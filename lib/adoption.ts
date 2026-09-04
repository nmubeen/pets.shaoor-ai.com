// Public adoption profile queries — no auth required. Reachable because of
// the additive "adoption profiles are public" RLS policy on menagerie.pets
// (supabase/migrations/0006_gallery.sql): a row is visible if the caller
// belongs to the tenant OR the pet is marked is_adoptable, whichever
// applies. Unauthenticated requests here always take the second branch.
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Species } from "@/lib/database.types";

export type AdoptablePet = {
  id: string;
  name: string;
  species: Species;
  breed: string;
  lifeStage: string | null;
  adoptionNote: string | null;
  orgName: string;
};

function mapRow(p: {
  id: string;
  name: string;
  species: Species;
  breed: string;
  life_stage: string | null;
  adoption_note: string | null;
  tenants: unknown;
}): AdoptablePet {
  const tenant = p.tenants as unknown as { name: string } | null;
  return {
    id: p.id,
    name: p.name,
    species: p.species,
    breed: p.breed,
    lifeStage: p.life_stage,
    adoptionNote: p.adoption_note,
    orgName: tenant?.name ?? "A Menagerie workspace",
  };
}

export async function listAdoptablePets(): Promise<AdoptablePet[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pets")
    .select("id, name, species, breed, life_stage, adoption_note, tenants(name)")
    .eq("is_adoptable", true)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapRow);
}

export async function getAdoptablePet(id: string): Promise<AdoptablePet | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pets")
    .select("id, name, species, breed, life_stage, adoption_note, tenants(name)")
    .eq("id", id)
    .eq("is_adoptable", true)
    .maybeSingle();
  return data ? mapRow(data) : null;
}
