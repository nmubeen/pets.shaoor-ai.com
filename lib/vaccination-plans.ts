// vaccine_protocols rows for Settings → Care's "Vaccination plans" section
// — the built-in dog/cat defaults (tenant_id null) alongside a workspace's
// own custom entries (tenant_id set), same table as the predictive
// scheduling feature (0014_predictive_scheduling.sql, extended by
// 0020_unified_visits.sql, species column renamed from species_group by
// 0022_rename_species_breed.sql). Deliberately doesn't filter by tenant_id
// in the query — RLS already returns "global OR mine", which is exactly
// the built-in-plus-custom list this page shows.
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Species } from "@/lib/database.types";

export type VaccinationPlan = {
  id: string;
  isBuiltIn: boolean;
  species: Species;
  vaccineName: string;
  ageWeeksDue: number;
  boosterIntervalMonths: number | null;
  notes: string | null;
};

export async function getVaccinationPlans(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<VaccinationPlan[]> {
  const { data } = await supabase
    .from("vaccine_protocols")
    .select("id, tenant_id, species, vaccine_name, age_weeks_due, booster_interval_months, notes")
    .order("species")
    .order("vaccine_name");

  return (data ?? []).map((p) => ({
    id: p.id,
    isBuiltIn: p.tenant_id === null,
    species: p.species,
    vaccineName: p.vaccine_name,
    ageWeeksDue: p.age_weeks_due,
    boosterIntervalMonths: p.booster_interval_months,
    notes: p.notes,
  }));
}
