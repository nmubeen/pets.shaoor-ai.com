// Builds the /app/vet-view page's per-pet data and summary items
// — a deterministic template built from the same records the Health tabs
// already show, not an LLM call (this app has no AI integration). Reuses
// lib/health.ts / lib/medications.ts / lib/growth.ts's existing
// tenant-wide fetchers rather than adding new queries — this just groups
// their results by pet, the same way lib/pet-links.ts already does.
import "server-only";
import type { RosterItem } from "@/lib/roster";
import type { HealthRow, VisitRow } from "@/lib/health";
import type { MedicationRow } from "@/lib/medications";
import type { PetWeightHistory } from "@/lib/growth";
import { ageLabel } from "@/lib/pet-labels";

export type PetVetSummary = {
  pet: RosterItem;
  /** Computed once, here, server-side — VetView (a client component) must never call ageLabel() itself: it's Date.now()-based, and calling it again during the client's hydration pass (a few ms after the server's own render) is a textbook hydration-mismatch source. */
  ageLabel: string | null;
  summaryItems: VetSummaryItem[];
  visits: VisitRow[];
  illnesses: HealthRow[];
  vaccinations: HealthRow[];
  medications: MedicationRow[];
  weightHistory: PetWeightHistory | null;
};

export type VetSummaryItem = {
  kind: "visits" | "vaccinations" | "illnesses" | "medications" | "weight" | "records";
  text: string;
};

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// Age/gender/species/breed deliberately aren't repeated here — they're
// already the header + sub-header shown right below the pet card
// (components/vet-view/VetView.tsx), so this starts straight at the
// actual health facts instead of re-stating who the pet is.
function buildSummaryItems(
  pet: RosterItem,
  visits: VisitRow[],
  illnesses: HealthRow[],
  vaccinations: HealthRow[],
  medications: MedicationRow[],
  weightHistory: PetWeightHistory | null
): VetSummaryItem[] {
  if (!pet.pet) return [{ kind: "records", text: "No health records logged yet." }];

  const items: VetSummaryItem[] = [];

  if (visits.length > 0) {
    items.push({ kind: "visits", text: `${plural(visits.length, "visit")} logged, most recent ${visits[0].date}.` });
  }

  const dueVax = vaccinations.filter((v) => v.statusRaw !== "complete");
  if (dueVax.length > 0) {
    items.push({
      kind: "vaccinations",
      text: `${plural(dueVax.length, "vaccination")} due (${dueVax.map((v) => v.reason).join(", ")}).`,
    });
  } else if (vaccinations.length > 0) {
    items.push({ kind: "vaccinations", text: "Vaccinations up to date." });
  }

  if (illnesses.length > 0) {
    const active = illnesses.filter((i) => i.statusRaw === "active").length;
    items.push({
      kind: "illnesses",
      text: `${plural(illnesses.length, "illness")} on record${active > 0 ? `, ${plural(active, "active")}` : ", all resolved"}.`,
    });
  }

  const activeMeds = medications.filter((m) => m.status === "active");
  if (activeMeds.length > 0) {
    items.push({
      kind: "medications",
      text: `On ${plural(activeMeds.length, "medication")} (${activeMeds.map((m) => m.name).join(", ")}).`,
    });
  }

  const points = weightHistory?.points ?? [];
  if (points.length > 0) {
    const last = points[points.length - 1];
    items.push({ kind: "weight", text: `Last weighed ${last.weightKg} kg on ${last.date}.` });
  }

  if (items.length === 0) items.push({ kind: "records", text: "No health records logged yet." });

  return items;
}

/** Groups every tenant-wide health list by pet and builds each pet's summary items in one pass. */
export function buildVetSummaries(
  pets: RosterItem[],
  visits: VisitRow[],
  illnesses: HealthRow[],
  vaccinations: HealthRow[],
  medications: MedicationRow[],
  weightHistory: PetWeightHistory[]
): PetVetSummary[] {
  const weightByPet = new Map(weightHistory.map((w) => [w.petId, w]));

  return pets.map((pet) => {
    const petVisits = visits.filter((v) => v.petId === pet.id);
    const petIllnesses = illnesses.filter((i) => i.petId === pet.id);
    const petVaccinations = vaccinations
      .filter((v) => v.petId === pet.id)
      .sort((a, b) => b.dateIso.localeCompare(a.dateIso));
    const petMedications = medications.filter((m) => m.petId === pet.id);
    const petWeightHistory = weightByPet.get(pet.id) ?? null;

    return {
      pet,
      ageLabel: ageLabel(pet.pet?.birthDate ?? null),
      summaryItems: buildSummaryItems(pet, petVisits, petIllnesses, petVaccinations, petMedications, petWeightHistory),
      visits: petVisits,
      illnesses: petIllnesses,
      vaccinations: petVaccinations,
      medications: petMedications,
      weightHistory: petWeightHistory,
    };
  });
}
