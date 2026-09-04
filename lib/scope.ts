// Shared helpers for the polymorphic pet_id/habitat_id scope. Health
// records (visits, illnesses, vaccinations, medications) went pet-only
// (0017_scope_rework.sql) and no longer use this — see
// lib/actions/health.ts. shopping_orders and media both moved to a
// many-to-many join table instead (lib/actions/shopping.ts,
// lib/actions/gallery.ts) — an order or photo can now name any
// combination of pets/habitats, not just one, via MultiScopePicker. What's
// left here: care_tasks — required, parseScopeRequired, always exactly one
// pet or habitat, no household option.
import type { RosterKind } from "@/lib/database.types";

export type ScopeFields = { pet_id: string | null; habitat_id: string | null };

function fromKindId(kind: string, id: string): ScopeFields {
  const k = kind as RosterKind;
  return {
    pet_id: k === "pet" ? id : null,
    habitat_id: k === "habitat" ? id : null,
  };
}

/** Parses a ScopePicker's "kind:id" value. Fails if nothing was chosen. */
export function parseScopeRequired(raw: string | null): ScopeFields | { error: string } {
  const [kind, id] = raw?.split(":") ?? [];
  if (!kind || !id || !["pet", "habitat"].includes(kind)) {
    return { error: "Choose who this is about." };
  }
  return fromKindId(kind, id);
}

export function pickScopeId(row: ScopeFields): string | null {
  return row.pet_id ?? row.habitat_id;
}
