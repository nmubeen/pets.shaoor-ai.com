import type { RosterItem } from "@/lib/roster";

/**
 * A plain <select name="pet_id"> of individual pets only — used by Health
 * and Medications forms, which went pet-only in 0017_scope_rework.sql
 * (habitats don't have "health" in the individual-creature sense this
 * module tracks). `roster` may include habitats too; this filters them out
 * rather than requiring callers to pre-filter.
 *
 * Uncontrolled by default; pass `value` + `onChange` (VisitForm does, to
 * filter its species-scoped service suggestions as the pet selection
 * changes) to make it controlled instead.
 */
export function PetPicker({
  roster,
  value,
  onChange,
}: {
  roster: RosterItem[];
  value?: string;
  onChange?: (petId: string) => void;
}) {
  const pets = roster.filter((r) => r.kind === "pet");
  const controlled = value !== undefined;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Pet</span>
      <select
        name="pet_id"
        required
        {...(controlled ? { value } : { defaultValue: "" })}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
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
