import type { RosterItem } from "@/lib/roster";

/** A <select> encoding roster choice as "kind:id" — parsed server-side in lib/actions/health.ts. */
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
          Choose a pet, group, or habitat
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
