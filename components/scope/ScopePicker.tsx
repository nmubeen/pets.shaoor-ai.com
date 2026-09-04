import type { RosterItem } from "@/lib/roster";

/**
 * A <select> encoding roster choice as "kind:id" (or the literal value
 * "household" when allowHousehold is set) — parsed server-side by
 * lib/scope.ts's parseScopeRequired/parseScopeOptional.
 */
export function ScopePicker({ roster, allowHousehold = false }: { roster: RosterItem[]; allowHousehold?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Who</span>
      <select
        name="scope"
        required
        defaultValue={allowHousehold ? "household" : ""}
        className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
      >
        {!allowHousehold && (
          <option value="" disabled>
            Choose a pet, group, or habitat
          </option>
        )}
        {allowHousehold && <option value="household">🏠 Household</option>}
        {roster.map((r) => (
          <option key={r.id} value={`${r.kind}:${r.id}`}>
            {r.name}
          </option>
        ))}
      </select>
    </label>
  );
}
