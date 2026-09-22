import { ServicesTile, VaccinationsTile, FeedingTile, type DueServiceItem } from "@/components/home/HomeTiles";
import { requireActiveAccount } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getVaccinations } from "@/lib/health";
import { getPetHealthSummaries } from "@/lib/pet-links";
import { getFeedingSchedules } from "@/lib/feeding";

export default async function AppHomePage() {
  const { supabase, active } = await requireActiveAccount();
  const [roster, vaccinations, petHealthSummaries, feedingSchedules] = await Promise.all([
    getRoster(supabase, active.tenantId),
    getVaccinations(supabase, active.tenantId),
    getPetHealthSummaries(supabase, active.tenantId),
    getFeedingSchedules(supabase, active.tenantId),
  ]);

  const petNameById = new Map(roster.filter((r) => r.kind === "pet").map((r) => [r.id, r.name]));

  // Same source as each pet card's own summary (lib/pet-links.ts, shown
  // via PetHealthLinks on /app/pets) — flattened across every pet and
  // sorted soonest-first, so this tile never disagrees with what the
  // pets page already shows as due.
  const dueServices: DueServiceItem[] = [];
  for (const [petId, summary] of petHealthSummaries) {
    const who = petNameById.get(petId) ?? "Unknown";
    summary.nextServices.forEach((s, i) => {
      dueServices.push({ id: `${petId}-${i}`, petId, who, label: s.label, date: s.date, dateIso: s.dateIso, overdue: s.overdue });
    });
  }
  dueServices.sort((a, b) => a.dateIso.localeCompare(b.dateIso));

  const dueVaccinations = vaccinations
    .filter((v) => v.statusRaw !== "complete" && v.dueDateIso)
    .sort((a, b) => a.dueDateIso!.localeCompare(b.dueDateIso!));

  // Just the next unfed meal per pet, not every meal left today — each
  // pet only needs one line until that one's done (see FeedingTile,
  // which further combines pets sharing the same meal/time/portion).
  const nextFeedingByPet = new Map<string, (typeof feedingSchedules)[number]>();
  for (const s of feedingSchedules) {
    if (s.todayLog) continue;
    if (!nextFeedingByPet.has(s.petId)) nextFeedingByPet.set(s.petId, s);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl mb-1 text-(--color-primary-text)">Home</h1>
        <p className="text-sm text-muted">What needs your attention</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <FeedingTile tenantId={active.tenantId} upcoming={[...nextFeedingByPet.values()]} />
        <ServicesTile services={dueServices} />
        <VaccinationsTile tenantId={active.tenantId} vaccinations={dueVaccinations} />
      </div>
    </div>
  );
}
