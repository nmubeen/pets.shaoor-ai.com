// Shared helpers for the polymorphic pet_id/group_id/habitat_id scope used
// across stat_entries, vet_visits, illnesses, vaccinations, grooming_visits
// (always exactly one — §03: "Habitats are peers of pets"), and
// shopping_orders/care_tasks (zero or one — §03: "three-level scoping,
// pet, group, or household", where "household" means all three null).
import type { RosterKind } from "@/lib/database.types";

export type ScopeFields = { pet_id: string | null; group_id: string | null; habitat_id: string | null };

function fromKindId(kind: string, id: string): ScopeFields {
  const k = kind as RosterKind;
  return {
    pet_id: k === "pet" ? id : null,
    group_id: k === "group" ? id : null,
    habitat_id: k === "habitat" ? id : null,
  };
}

/** Parses a ScopePicker's "kind:id" value. Fails if nothing was chosen. */
export function parseScopeRequired(raw: string | null): ScopeFields | { error: string } {
  const [kind, id] = raw?.split(":") ?? [];
  if (!kind || !id || !["pet", "group", "habitat"].includes(kind)) {
    return { error: "Choose who this is about." };
  }
  return fromKindId(kind, id);
}

/** Same, but "household" (or nothing) is valid and means all-null (tenant-wide). */
export function parseScopeOptional(raw: string | null): ScopeFields {
  if (!raw || raw === "household") return { pet_id: null, group_id: null, habitat_id: null };
  const [kind, id] = raw.split(":");
  if (!kind || !id) return { pet_id: null, group_id: null, habitat_id: null };
  return fromKindId(kind, id);
}

export function pickScopeId(row: ScopeFields): string | null {
  return row.pet_id ?? row.group_id ?? row.habitat_id;
}
