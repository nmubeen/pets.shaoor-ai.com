// Weight history for the growth chart on /app/health — pulled straight from
// vet_visits.weight_kg and grooming_visits.weight_kg (weight is normally
// checked at both kinds of visit), merged and sorted per pet. Deliberately
// independent of pets.weight_kg, which stays a separate, manually-set
// "current weight" snapshot on the pet's own record — this never writes to
// it, only reads the visit history.
import "server-only";
import type { createClient } from "@/lib/supabase/server";

export type WeightPoint = {
  dateIso: string;
  date: string;
  weightKg: number;
  source: "vet" | "grooming";
};

export type PetWeightHistory = {
  petId: string;
  petName: string;
  /** Sorted ascending by date. */
  points: WeightPoint[];
};

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

export async function getWeightHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<PetWeightHistory[]> {
  const [{ data: pets }, { data: vetRows }, { data: groomRows }] = await Promise.all([
    supabase.from("pets").select("id, name").eq("tenant_id", tenantId).order("created_at"),
    supabase
      .from("vet_visits")
      .select("pet_id, visit_date, weight_kg")
      .eq("tenant_id", tenantId)
      .not("weight_kg", "is", null)
      .not("pet_id", "is", null),
    supabase
      .from("grooming_visits")
      .select("pet_id, visit_date, weight_kg")
      .eq("tenant_id", tenantId)
      .not("weight_kg", "is", null)
      .not("pet_id", "is", null),
  ]);

  const byPet = new Map<string, WeightPoint[]>();
  const addRow = (petId: string | null, date: string, weight: number | null, source: "vet" | "grooming") => {
    if (!petId || weight === null) return;
    const list = byPet.get(petId) ?? [];
    list.push({ dateIso: date, date: fmtDate(date), weightKg: weight, source });
    byPet.set(petId, list);
  };
  for (const r of vetRows ?? []) addRow(r.pet_id, r.visit_date, r.weight_kg, "vet");
  for (const r of groomRows ?? []) addRow(r.pet_id, r.visit_date, r.weight_kg, "grooming");

  return (pets ?? []).map((p) => ({
    petId: p.id,
    petName: p.name,
    points: (byPet.get(p.id) ?? []).sort((a, b) => a.dateIso.localeCompare(b.dateIso)),
  }));
}
