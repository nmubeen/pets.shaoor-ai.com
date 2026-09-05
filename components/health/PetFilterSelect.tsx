"use client";

import type { RosterItem } from "@/lib/roster";

/**
 * "All pets" + one option per pet — the same pet-narrowing affordance
 * GrowthPanel already had (there, always one specific pet since it plots
 * a single line), extended to Visits/Illnesses/Vaccinations/Medications,
 * which show every pet mixed together by default and benefit from an
 * "All pets" option on top of narrowing to one.
 */
export function PetFilterSelect({
  roster,
  value,
  onChange,
}: {
  roster: RosterItem[];
  value: string;
  onChange: (petId: string) => void;
}) {
  const pets = roster.filter((r) => r.kind === "pet");
  if (pets.length === 0) return null;

  return (
    <label className="flex flex-col gap-1.5 max-w-xs">
      <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Pet</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
      >
        <option value="all">All pets</option>
        {pets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
