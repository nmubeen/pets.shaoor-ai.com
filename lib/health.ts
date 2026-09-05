// Fetches and formats health records for /app/health and the dashboard's
// "Recent health events" widget. Pet-only (0017_scope_rework.sql) — "who"
// is always pet_id, resolved to a name directly against pets rather than
// the full pet+habitat roster.
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getProviders } from "@/lib/providers";
import { formatCurrency } from "@/lib/format";

export type HealthRow = {
  id: string;
  petId: string;
  date: string;
  dateIso: string;
  /** Raw due_date for vaccinations — separate from `dateIso` (which prefers administered_date) since editing acts on due_date, matching the add form. Null for illnesses. */
  dueDateIso: string | null;
  who: string;
  reason: string;
  provider: string | null;
  cost: string | null;
  status: string | null;
  /** Raw enum value ('active'/'resolved' or 'due'/'scheduled'/'complete') — `status` above is the display label. */
  statusRaw: string | null;
  notes: string | null;
};

/** One line item shown under a visit — a service performed or a vaccine given. */
export type VisitLineItem = { name: string; cost: string | null };

export type VisitRow = {
  id: string;
  petId: string;
  date: string;
  dateIso: string;
  who: string;
  reason: string;
  provider: string | null;
  providerId: string | null;
  /** Consulting doctor — the facility (provider) is fixed, who saw the pet can vary visit to visit. */
  doctor: string | null;
  weightKg: number | null;
  notes: string | null;
  services: VisitLineItem[];
  vaccinations: VisitLineItem[];
  /** Sum of every line item — computed and stored at write time (lib/actions/health.ts). */
  cost: string | null;
};

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

async function whoResolver(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string) {
  const { data: pets } = await supabase.from("pets").select("id, name").eq("tenant_id", tenantId);
  const byId = new Map((pets ?? []).map((p) => [p.id, p.name]));
  return (petId: string) => byId.get(petId) ?? "Unknown";
}

async function providerResolver(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string) {
  const providers = await getProviders(supabase, tenantId);
  const byId = new Map(providers.map((p) => [p.id, p.name]));
  return (providerId: string | null) => (providerId ? (byId.get(providerId) ?? null) : null);
}

/**
 * A visit is one real-world trip — it can carry any mix of services
 * (visit_services) and vaccinations given (vaccinations.visit_id), which is
 * why this returns a richer shape than the other health lists (those are
 * single-event-per-row; a visit isn't). See lib/actions/health.ts's
 * addVisit for how the line items and the stored total cost are built.
 */
export async function getVisits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<VisitRow[]> {
  const [{ data: visits }, { data: serviceRows }, { data: vaxRows }, who, provider] = await Promise.all([
    supabase
      .from("visits")
      .select("id, pet_id, provider_id, vet_name, visit_date, reason, cost, weight_kg, notes")
      .eq("tenant_id", tenantId)
      .order("visit_date", { ascending: false }),
    supabase.from("visit_services").select("visit_id, name, cost").eq("tenant_id", tenantId),
    supabase.from("vaccinations").select("visit_id, reason, cost").eq("tenant_id", tenantId).not("visit_id", "is", null),
    whoResolver(supabase, tenantId),
    providerResolver(supabase, tenantId),
  ]);

  const servicesByVisit = new Map<string, VisitLineItem[]>();
  for (const r of serviceRows ?? []) {
    const list = servicesByVisit.get(r.visit_id) ?? [];
    list.push({ name: r.name, cost: formatCurrency(r.cost) });
    servicesByVisit.set(r.visit_id, list);
  }

  const vaxByVisit = new Map<string, VisitLineItem[]>();
  for (const r of vaxRows ?? []) {
    if (!r.visit_id) continue;
    const list = vaxByVisit.get(r.visit_id) ?? [];
    list.push({ name: r.reason, cost: formatCurrency(r.cost) });
    vaxByVisit.set(r.visit_id, list);
  }

  return (visits ?? []).map((v) => ({
    id: v.id,
    petId: v.pet_id,
    date: fmtDate(v.visit_date),
    dateIso: v.visit_date,
    who: who(v.pet_id),
    reason: v.reason,
    provider: provider(v.provider_id),
    providerId: v.provider_id,
    doctor: v.vet_name,
    weightKg: v.weight_kg,
    notes: v.notes,
    services: servicesByVisit.get(v.id) ?? [],
    vaccinations: vaxByVisit.get(v.id) ?? [],
    cost: formatCurrency(v.cost),
  }));
}

export async function getIllnesses(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<HealthRow[]> {
  const [{ data }, who] = await Promise.all([
    supabase
      .from("illnesses")
      .select("id, pet_id, diagnosed_date, reason, status, notes")
      .eq("tenant_id", tenantId)
      .order("diagnosed_date", { ascending: false }),
    whoResolver(supabase, tenantId),
  ]);

  return (data ?? []).map((v) => ({
    id: v.id,
    petId: v.pet_id,
    date: fmtDate(v.diagnosed_date),
    dateIso: v.diagnosed_date,
    dueDateIso: null,
    who: who(v.pet_id),
    reason: v.reason,
    provider: null,
    cost: null,
    status: v.status === "resolved" ? "Resolved" : "Active",
    statusRaw: v.status,
    notes: v.notes,
  }));
}

/** Distinct names of not-yet-complete vaccinations — datalist suggestions for VisitForm's "Vaccinations given" rows. */
export async function getDueVaccinationNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<string[]> {
  const { data } = await supabase.from("vaccinations").select("reason").eq("tenant_id", tenantId).neq("status", "complete");
  return [...new Set((data ?? []).map((v) => v.reason))];
}

export async function getVaccinations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<HealthRow[]> {
  const [{ data }, who] = await Promise.all([
    supabase
      .from("vaccinations")
      .select("id, pet_id, due_date, administered_date, reason, status, cost, notes")
      .eq("tenant_id", tenantId)
      .order("due_date", { ascending: false, nullsFirst: false }),
    whoResolver(supabase, tenantId),
  ]);

  const statusLabel: Record<string, string> = { due: "Due", scheduled: "Scheduled", complete: "Complete" };

  return (data ?? []).map((v) => ({
    id: v.id,
    petId: v.pet_id,
    date: fmtDate(v.administered_date ?? v.due_date ?? new Date().toISOString().slice(0, 10)),
    dateIso: v.administered_date ?? v.due_date ?? "",
    dueDateIso: v.due_date,
    who: who(v.pet_id),
    reason: v.reason,
    provider: null,
    cost: formatCurrency(v.cost),
    status: statusLabel[v.status] ?? v.status,
    statusRaw: v.status,
    notes: v.notes,
  }));
}
