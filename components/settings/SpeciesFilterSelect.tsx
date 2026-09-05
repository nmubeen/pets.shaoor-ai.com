"use client";

import { SPECIES_LIST, SPECIES_LABEL } from "@/lib/species-labels";

/**
 * "All species" + one option per species — narrows Care's Service Types
 * and Vaccination plans lists, the same "All X" + one-per-item pattern as
 * Health's PetFilterSelect.
 */
export function SpeciesFilterSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (species: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 max-w-xs">
      <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Species</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
      >
        <option value="all">All species</option>
        {SPECIES_LIST.map((s) => (
          <option key={s} value={s}>
            {SPECIES_LABEL[s]}
          </option>
        ))}
      </select>
    </label>
  );
}
