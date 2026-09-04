// Shared species list + display labels — used by the roster form, the
// service-types and vaccination-plans settings editors, and the visit
// form's species-scoped suggestions. Renamed from the old "species group"
// classifier to just "species" (0022_rename_species_breed.sql) — it's now
// the one structured, required field on a pet, paired with the one
// free-text required `breed` (e.g. species "dog", breed "Labrador").
import type { Species } from "@/lib/database.types";

export const SPECIES_LIST: Species[] = ["dog", "cat", "bird", "reptile", "fish", "small_mammal", "other"];

export const SPECIES_LABEL: Record<Species, string> = {
  dog: "Dog",
  cat: "Cat",
  bird: "Bird",
  reptile: "Reptile",
  fish: "Fish",
  small_mammal: "Small mammal",
  other: "Other",
};
