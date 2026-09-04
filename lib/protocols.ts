// Turns a species + birth_date into a concrete, editable vaccination
// schedule — the "predictive" half of the feature. See
// supabase/migrations/0014_predictive_scheduling.sql for the data model
// and the reasoning behind how series doses vs. recurring boosters work.
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Species } from "@/lib/database.types";

export type ProtocolStep = {
  id: string;
  vaccineName: string;
  doseSequence: number;
  ageWeeksDue: number;
  boosterIntervalMonths: number | null;
  isCore: boolean;
  notes: string | null;
};

export async function getProtocols(
  supabase: Awaited<ReturnType<typeof createClient>>,
  species: Species
): Promise<ProtocolStep[]> {
  const { data } = await supabase
    .from("vaccine_protocols")
    .select("id, vaccine_name, dose_sequence, age_weeks_due, booster_interval_months, is_core, notes")
    .eq("species", species)
    .order("vaccine_name")
    .order("dose_sequence");

  return (data ?? []).map((p) => ({
    id: p.id,
    vaccineName: p.vaccine_name,
    doseSequence: p.dose_sequence,
    ageWeeksDue: p.age_weeks_due,
    boosterIntervalMonths: p.booster_interval_months,
    isCore: p.is_core,
    notes: p.notes,
  }));
}

export function dueDateFor(birthDate: string, ageWeeksDue: number): string {
  const d = new Date(birthDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + ageWeeksDue * 7);
  return d.toISOString().slice(0, 10);
}
