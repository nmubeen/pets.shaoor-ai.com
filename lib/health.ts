// Fetches and formats health records for /app/health and the dashboard's
// "Recent health events" widget. Each record's scope (pet/group/habitat) is
// resolved to a display name via the roster (§03 — "who" is never split
// across three tables, it's whichever one of pet_id/group_id/habitat_id is set).
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getRoster } from "@/lib/roster";

export type HealthRow = {
  id: string;
  date: string;
  dateIso: string;
  who: string;
  reason: string;
  cost: string | null;
  status: string | null;
  notes: string | null;
};

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function fmtCost(value: number | null): string | null {
  if (value === null) return null;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

async function whoResolver(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string) {
  const roster = await getRoster(supabase, tenantId);
  const byId = new Map(roster.map((r) => [r.id, r.name]));
  return (row: { pet_id: string | null; group_id: string | null; habitat_id: string | null }) =>
    byId.get(row.pet_id ?? row.group_id ?? row.habitat_id ?? "") ?? "Unknown";
}

export async function getVetVisits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<HealthRow[]> {
  const [{ data }, who] = await Promise.all([
    supabase
      .from("vet_visits")
      .select("id, pet_id, group_id, habitat_id, visit_date, reason, cost, notes")
      .eq("tenant_id", tenantId)
      .order("visit_date", { ascending: false }),
    whoResolver(supabase, tenantId),
  ]);

  return (data ?? []).map((v) => ({
    id: v.id,
    date: fmtDate(v.visit_date),
    dateIso: v.visit_date,
    who: who(v),
    reason: v.reason,
    cost: fmtCost(v.cost),
    status: null,
    notes: v.notes,
  }));
}

export async function getIllnesses(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<HealthRow[]> {
  const [{ data }, who] = await Promise.all([
    supabase
      .from("illnesses")
      .select("id, pet_id, group_id, habitat_id, diagnosed_date, reason, status, notes")
      .eq("tenant_id", tenantId)
      .order("diagnosed_date", { ascending: false }),
    whoResolver(supabase, tenantId),
  ]);

  return (data ?? []).map((v) => ({
    id: v.id,
    date: fmtDate(v.diagnosed_date),
    dateIso: v.diagnosed_date,
    who: who(v),
    reason: v.reason,
    cost: null,
    status: v.status === "resolved" ? "Resolved" : "Active",
    notes: v.notes,
  }));
}

export async function getVaccinations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<HealthRow[]> {
  const [{ data }, who] = await Promise.all([
    supabase
      .from("vaccinations")
      .select("id, pet_id, group_id, habitat_id, due_date, administered_date, reason, status, notes")
      .eq("tenant_id", tenantId)
      .order("due_date", { ascending: false, nullsFirst: false }),
    whoResolver(supabase, tenantId),
  ]);

  const statusLabel: Record<string, string> = { due: "Due", scheduled: "Scheduled", complete: "Complete" };

  return (data ?? []).map((v) => ({
    id: v.id,
    date: fmtDate(v.administered_date ?? v.due_date ?? new Date().toISOString().slice(0, 10)),
    dateIso: v.administered_date ?? v.due_date ?? "",
    who: who(v),
    reason: v.reason,
    cost: null,
    status: statusLabel[v.status] ?? v.status,
    notes: v.notes,
  }));
}

export async function getGroomingVisits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<HealthRow[]> {
  const [{ data }, who] = await Promise.all([
    supabase
      .from("grooming_visits")
      .select("id, pet_id, group_id, habitat_id, visit_date, service, cost, notes")
      .eq("tenant_id", tenantId)
      .order("visit_date", { ascending: false }),
    whoResolver(supabase, tenantId),
  ]);

  return (data ?? []).map((v) => ({
    id: v.id,
    date: fmtDate(v.visit_date),
    dateIso: v.visit_date,
    who: who(v),
    reason: v.service,
    cost: fmtCost(v.cost),
    status: null,
    notes: v.notes,
  }));
}
