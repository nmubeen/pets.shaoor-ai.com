// Powers the Health summary shown on each pet's card at /app/pets — not
// counts (those weren't actionable — "10 visits" doesn't tell you
// anything to do), but what's actually worth knowing at a glance: when
// this pet was last seen, every recurring service's next due date, and
// what vaccination is coming up.
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export type DueItem = { label: string; date: string; dateIso: string; overdue: boolean };

export type PetHealthSummary = {
  lastVisit: { date: string; dateIso: string } | null;
  /** One entry per recurring service this pet has ever had logged, soonest due first — computed directly from (this pet's most recent visit that logged it) + (its service type's current frequency_days), not from the separate care_tasks reminder row. Computing it live means changing a service type's frequency takes effect immediately for every pet that's ever had it logged, instead of only for visits logged after the frequency was set (care_tasks is only ever written at visit-log time — see upsertServiceReminder in lib/actions/health.ts). */
  nextServices: DueItem[];
  /** Soonest not-yet-complete vaccination. */
  nextVaccination: DueItem | null;
};

function fmtDate(iso: string): string {
  return formatDate(new Date(iso + "T00:00:00"));
}

function isOverdue(dueIso: string): boolean {
  return new Date(dueIso + "T00:00:00").getTime() < new Date(new Date().toDateString()).getTime();
}

export async function getPetHealthSummaries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<Map<string, PetHealthSummary>> {
  const [{ data: visits }, { data: visitServices }, { data: serviceTypes }, { data: vaccinations }] = await Promise.all([
    supabase.from("visits").select("id, pet_id, visit_date").eq("tenant_id", tenantId),
    supabase.from("visit_services").select("visit_id, service_type_id, name").eq("tenant_id", tenantId).not("service_type_id", "is", null),
    supabase.from("care_service_types").select("id, frequency_days").eq("tenant_id", tenantId).not("frequency_days", "is", null),
    supabase
      .from("vaccinations")
      .select("pet_id, reason, due_date")
      .eq("tenant_id", tenantId)
      .neq("status", "complete")
      .not("due_date", "is", null)
      .order("due_date", { ascending: true }),
  ]);

  const summaries = new Map<string, PetHealthSummary>();
  function forPet(petId: string): PetHealthSummary {
    const existing = summaries.get(petId);
    if (existing) return existing;
    const fresh: PetHealthSummary = { lastVisit: null, nextServices: [], nextVaccination: null };
    summaries.set(petId, fresh);
    return fresh;
  }

  const visitById = new Map((visits ?? []).map((v) => [v.id, v]));
  const frequencyByServiceType = new Map((serviceTypes ?? []).map((s) => [s.id, s.frequency_days as number]));

  // Soonest visit_date wins — visits arrive in no particular order here,
  // so every row is compared rather than just taking the first.
  for (const v of visits ?? []) {
    const s = forPet(v.pet_id);
    if (!s.lastVisit || v.visit_date > s.lastVisit.dateIso) {
      s.lastVisit = { date: fmtDate(v.visit_date), dateIso: v.visit_date };
    }
  }

  // For each (pet, recurring service type) pair, find the most recent
  // visit that logged it, then due = that visit's date + the type's
  // *current* frequency_days — so editing a service type's frequency
  // takes effect immediately for every pet that's ever had it logged, not
  // just future visits.
  const latestByPetAndType = new Map<string, { visitDate: string; name: string }>();
  for (const vs of visitServices ?? []) {
    if (!vs.service_type_id) continue;
    const frequencyDays = frequencyByServiceType.get(vs.service_type_id);
    if (frequencyDays === undefined) continue;
    const visit = visitById.get(vs.visit_id);
    if (!visit) continue;
    const key = `${visit.pet_id}::${vs.service_type_id}`;
    const existing = latestByPetAndType.get(key);
    if (!existing || visit.visit_date > existing.visitDate) {
      latestByPetAndType.set(key, { visitDate: visit.visit_date, name: vs.name });
    }
  }
  for (const [key, latest] of latestByPetAndType) {
    const [petId, serviceTypeId] = key.split("::");
    const frequencyDays = frequencyByServiceType.get(serviceTypeId)!;
    const due = new Date(latest.visitDate + "T00:00:00Z");
    due.setUTCDate(due.getUTCDate() + frequencyDays);
    const dueIso = due.toISOString().slice(0, 10);
    forPet(petId).nextServices.push({ label: latest.name, date: fmtDate(dueIso), dateIso: dueIso, overdue: isOverdue(dueIso) });
  }
  for (const s of summaries.values()) {
    s.nextServices.sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  }

  // Pre-sorted soonest-due-first, so the first row seen per pet is
  // already the one to keep.
  for (const v of vaccinations ?? []) {
    if (!v.due_date) continue;
    const s = forPet(v.pet_id);
    if (!s.nextVaccination) s.nextVaccination = { label: v.reason, date: fmtDate(v.due_date), dateIso: v.due_date, overdue: isOverdue(v.due_date) };
  }

  return summaries;
}
