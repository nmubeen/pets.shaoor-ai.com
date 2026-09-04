// The tenant-editable service catalog (Settings → Care) — Deworming, Nail
// Clipping, Grooming, Consultation, etc. Entries with a frequency_days
// drive automatic care_task reminders when logged on a visit (see
// lib/actions/health.ts's upsertServiceReminder); entries without one
// (e.g. Consultation) are just a name to pick from, no reminder.
import "server-only";
import type { createClient } from "@/lib/supabase/server";

export type ServiceType = {
  id: string;
  name: string;
  frequencyDays: number | null;
};

export async function getServiceTypes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<ServiceType[]> {
  const { data } = await supabase
    .from("care_service_types")
    .select("id, name, frequency_days")
    .eq("tenant_id", tenantId)
    .order("name");

  return (data ?? []).map((s) => ({ id: s.id, name: s.name, frequencyDays: s.frequency_days }));
}
