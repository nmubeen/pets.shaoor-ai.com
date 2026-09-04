// Weight history for the growth chart on /app/health — pulled straight from
// visits.weight_kg (weight is normally checked at a visit regardless of
// what it was for), sorted per pet. Deliberately independent of
// pets.weight_kg, which stays a separate, manually-set "current weight"
// snapshot on the pet's own record — this never writes to it, only reads
// the visit history. Visits and grooming visits merged into one table
// (0020_unified_visits.sql), so there's no more vet-vs-grooming source
// distinction to color-code by.
import "server-only";
import type { createClient } from "@/lib/supabase/server";

export type WeightPoint = {
  dateIso: string;
  date: string;
  weightKg: number;
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
  const [{ data: pets }, { data: rows }] = await Promise.all([
    supabase.from("pets").select("id, name").eq("tenant_id", tenantId).order("created_at"),
    supabase.from("visits").select("pet_id, visit_date, weight_kg").eq("tenant_id", tenantId).not("weight_kg", "is", null),
  ]);

  const byPet = new Map<string, WeightPoint[]>();
  for (const r of rows ?? []) {
    if (r.weight_kg === null) continue;
    const list = byPet.get(r.pet_id) ?? [];
    list.push({ dateIso: r.visit_date, date: fmtDate(r.visit_date), weightKg: r.weight_kg });
    byPet.set(r.pet_id, list);
  }

  return (pets ?? []).map((p) => ({
    petId: p.id,
    petName: p.name,
    points: (byPet.get(p.id) ?? []).sort((a, b) => a.dateIso.localeCompare(b.dateIso)),
  }));
}
