// Builds the /app/vet-view page's per-pet data and its "short narration"
// — a deterministic template built from the same records the Health tabs
// already show, not an LLM call (this app has no AI integration). Reuses
// lib/health.ts / lib/medications.ts / lib/growth.ts's existing
// tenant-wide fetchers rather than adding new queries — this just groups
// their results by pet, the same way lib/pet-links.ts already does.
import "server-only";
import type { RosterItem } from "@/lib/roster";
import { ageLabel, SEX_LABEL } from "@/lib/pet-labels";
import type { HealthRow, VisitRow } from "@/lib/health";
import type { MedicationRow } from "@/lib/medications";
import type { PetWeightHistory } from "@/lib/growth";
import { SPECIES_LABEL } from "@/lib/species-labels";

export type PetVetSummary = {
  pet: RosterItem;
  narration: string;
  visits: VisitRow[];
  illnesses: HealthRow[];
  vaccinations: HealthRow[];
  medications: MedicationRow[];
  weightHistory: PetWeightHistory | null;
};

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function buildNarration(
  pet: RosterItem,
  visits: VisitRow[],
  illnesses: HealthRow[],
  vaccinations: HealthRow[],
  medications: MedicationRow[],
  weightHistory: PetWeightHistory | null
): string {
  const p = pet.pet;
  if (!p) return `${pet.name}.`;

  const age = ageLabel(p.birthDate);
  const sex = SEX_LABEL[p.sex];
  const sentences: string[] = [
    `${pet.name} is a${age ? ` ${age} old` : ""}${sex ? ` ${sex.toLowerCase()}` : ""} ${p.breed} (${SPECIES_LABEL[p.species]})${p.neutered ? ", neutered/spayed" : ""}.`,
  ];

  if (visits.length > 0) {
    sentences.push(`${plural(visits.length, "visit")} logged, most recent ${visits[0].date}.`);
  }

  const dueVax = vaccinations.filter((v) => v.statusRaw !== "complete");
  if (dueVax.length > 0) {
    sentences.push(`${plural(dueVax.length, "vaccination")} due (${dueVax.map((v) => v.reason).join(", ")}).`);
  } else if (vaccinations.length > 0) {
    sentences.push("Vaccinations up to date.");
  }

  if (illnesses.length > 0) {
    const active = illnesses.filter((i) => i.statusRaw === "active").length;
    sentences.push(
      `${plural(illnesses.length, "illness")} on record${active > 0 ? `, ${plural(active, "active")}` : ", all resolved"}.`
    );
  }

  const activeMeds = medications.filter((m) => m.status === "active");
  if (activeMeds.length > 0) {
    sentences.push(`On ${plural(activeMeds.length, "medication")} (${activeMeds.map((m) => m.name).join(", ")}).`);
  }

  const points = weightHistory?.points ?? [];
  if (points.length > 0) {
    const last = points[points.length - 1];
    sentences.push(`Last weighed ${last.weightKg} kg on ${last.date}.`);
  }

  if (sentences.length === 1) sentences.push("No health records logged yet.");

  return sentences.join(" ");
}

/** Groups every tenant-wide health list by pet and builds each pet's narration — one pass, reused by /app/vet-view for both the top narration block and the per-pet detail section below it. */
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
    const petVaccinations = vaccinations.filter((v) => v.petId === pet.id);
    const petMedications = medications.filter((m) => m.petId === pet.id);
    const petWeightHistory = weightByPet.get(pet.id) ?? null;

    return {
      pet,
      narration: buildNarration(pet, petVisits, petIllnesses, petVaccinations, petMedications, petWeightHistory),
      visits: petVisits,
      illnesses: petIllnesses,
      vaccinations: petVaccinations,
      medications: petMedications,
      weightHistory: petWeightHistory,
    };
  });
}
