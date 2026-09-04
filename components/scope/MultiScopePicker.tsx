"use client";

import { useState } from "react";
import type { RosterItem } from "@/lib/roster";

/**
 * A checklist of "Household" + every pet + every habitat — submits zero or
 * more `scope_ids` values ("pet:<id>" / "habitat:<id>"), read server-side
 * by lib/actions/shopping.ts. Unlike Health/Tasks (one specific pet-or-
 * habitat, always required), a shopping order can name any combination —
 * a bag of litter for two cats, a filter for one tank, or nothing at all
 * (household-wide, the default). Checking "Household" clears any specific
 * picks and disables the list, since it already covers everyone;
 * unchecking it (or picking something specific) re-enables it.
 */
export function MultiScopePicker({
  roster,
  initialSelectedIds = [],
}: {
  roster: RosterItem[];
  /** Roster ids to pre-check — used when editing an existing order. */
  initialSelectedIds?: string[];
}) {
  const pets = roster.filter((r) => r.kind === "pet");
  const habitats = roster.filter((r) => r.kind === "habitat");
  const [selected, setSelected] = useState(() => new Set(initialSelectedIds));
  const [household, setHousehold] = useState(initialSelectedIds.length === 0);

  function toggle(item: RosterItem) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      if (next.size > 0) setHousehold(false);
      return next;
    });
  }

  function checkHousehold() {
    setHousehold(true);
    setSelected(new Set());
  }

  const byId = new Map(roster.map((r) => [r.id, r]));

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Who</span>
      <label className="flex items-center gap-2 text-sm bg-paper border border-line rounded-lg px-3.5 py-2.5">
        <input type="checkbox" checked={household} onChange={checkHousehold} className="accent-primary" />
        🏠 Household (everyone)
      </label>

      {(pets.length > 0 || habitats.length > 0) && (
        <div className="border border-line rounded-lg p-3 max-h-48 overflow-y-auto flex flex-col gap-2.5">
          {pets.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[.62rem] uppercase tracking-[.05em] text-muted">Pets</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5">
                {pets.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="scope_ids"
                      value={`pet:${p.id}`}
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p)}
                      disabled={household}
                      className="accent-primary"
                    />
                    <span className="truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {habitats.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[.62rem] uppercase tracking-[.05em] text-muted">Habitats</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5">
                {habitats.map((h) => (
                  <label key={h.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="scope_ids"
                      value={`habitat:${h.id}`}
                      checked={selected.has(h.id)}
                      onChange={() => toggle(h)}
                      disabled={household}
                      className="accent-primary"
                    />
                    <span className="truncate">{h.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!household && selected.size > 0 && (
        <p className="text-xs text-muted">
          {[...selected].map((id) => byId.get(id)?.name).filter(Boolean).join(", ")}
        </p>
      )}
    </div>
  );
}
