import type { RosterItem } from "@/lib/roster";

/**
 * A plain <select name="pet_id"> of individual pets only — used by Health
 * and Medications forms, which went pet-only in 0017_scope_rework.sql
 * (habitats don't have "health" in the individual-creature sense this
 * module tracks). `roster` may include habitats too; this filters them out
 * rather than requiring callers to pre-filter.
 */
export function PetPicker({ roster }: { roster: RosterItem[] }) {
  const pets = roster.filter((r) => r.kind === "pet");
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Pet</span>
      <select
        name="pet_id"
        required
        defaultValue=""
        className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
      >
        <option value="" disabled>
          Choose a pet
        </option>
        {pets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
