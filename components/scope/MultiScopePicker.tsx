"use client";

import { useState } from "react";
import type { RosterItem } from "@/lib/roster";

/**
 * A checklist of every pet + every habitat — submits zero or more
 * `scope_ids` values ("pet:<id>" / "habitat:<id>"), read server-side by
 * lib/actions/shopping.ts and lib/actions/gallery.ts. Unlike Health/Tasks
 * (one specific pet-or-habitat, always required), an order or photo can
 * name any combination — a bag of litter for two cats, a filter for one
 * tank, a photo of the whole household, or nothing at all (still valid —
 * zero selections just means it's not tied to anything specific).
 */
export function MultiScopePicker({
  roster,
  initialSelectedIds = [],
}: {
  roster: RosterItem[];
  /** Roster ids to pre-check — used when editing an existing order/photo. */
  initialSelectedIds?: string[];
}) {
  const pets = roster.filter((r) => r.kind === "pet");
  const habitats = roster.filter((r) => r.kind === "habitat");
  const [selected, setSelected] = useState(() => new Set(initialSelectedIds));

  function toggle(item: RosterItem) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  const byId = new Map(roster.map((r) => [r.id, r]));

  if (pets.length === 0 && habitats.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Who (optional)</span>

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
                    className="accent-primary"
                  />
                  <span className="truncate">{h.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <p className="text-xs text-muted">
          {[...selected].map((id) => byId.get(id)?.name).filter(Boolean).join(", ")}
        </p>
      )}
    </div>
  );
}
