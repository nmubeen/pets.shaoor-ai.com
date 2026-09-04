import type { RosterItem } from "@/lib/roster";

/**
 * A <select> encoding roster choice as "kind:id" — parsed server-side by
 * lib/scope.ts's parseScopeRequired. Only care_tasks uses this now (always
 * exactly one pet or habitat); shopping and gallery moved to
 * MultiScopePicker (any combination, including none).
 */
export function ScopePicker({ roster }: { roster: RosterItem[] }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Who</span>
      <select
        name="scope"
        required
        defaultValue=""
        className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
      >
        <option value="" disabled>
          Choose a pet or habitat
        </option>
        {roster.map((r) => (
          <option key={r.id} value={`${r.kind}:${r.id}`}>
            {r.name}
          </option>
        ))}
      </select>
    </label>
  );
}
