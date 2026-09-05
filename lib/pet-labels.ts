// Sex label + age computation — split out from lib/roster.ts (which has
// "import server-only") so client components can use these without
// pulling in server-only code, same pattern as lib/provider-categories.ts.
import type { PetSex } from "@/lib/database.types";

export const SEX_LABEL: Record<PetSex, string | null> = { male: "Male", female: "Female", unknown: null };

export function ageLabel(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const months = Math.floor(
    (Date.now() - new Date(birthDate + "T00:00:00").getTime()) / (30.44 * 86_400_000)
  );
  if (months < 0) return null;
  if (months < 1) return "<1 mo";
  if (months < 24) return `${months} mo`;
  const years = Math.floor(months / 12);
  return `${years} yr${years === 1 ? "" : "s"}`;
}

/** Spayed/Not Spayed for a female, Neutered/Not Neutered otherwise — shared by Vet View's sub-header and the Pet Passport's data page. */
export function sterilizationLabel(sex: PetSex, neutered: boolean | null): string | null {
  if (neutered === null) return null;
  if (sex === "female") return neutered ? "Spayed" : "Not Spayed";
  return neutered ? "Neutered" : "Not Neutered";
}
