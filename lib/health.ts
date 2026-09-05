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
  /** Set when this row was captured via a Visit's line items rather than logged directly — Edit opens that visit instead of this row's own form, and Delete is disabled (see components/health/HealthView.tsx). */
  visitId: string | null;
  date: string;
  dateIso: string;
  /** Raw due_date for vaccinations — separate from `dateIso` (which prefers administered_date) since editing acts on due_date, matching the add form. Null for illnesses. */
  dueDateIso: string | null;
  who: string;
  reason: string;
  provider: string | null;
  /** Raw provider_id column — null for illnesses (no provider concept) and for visit-linked vaccinations (their clinic is derived from the visit, not stored here); set for a direct-entry vaccination so its edit form can prefill the picker. */
  providerId: string | null;
  cost: string | null;
  status: string | null;
  /** Raw enum value ('active'/'resolved' or 'due'/'scheduled'/'complete') — `status` above is the display label. */
  statusRaw: string | null;
  notes: string | null;
};

/** One line item shown under a visit — a service performed or a vaccine given. Carries its own id + raw cost so VisitForm can prefill and diff against them when editing (see updateVisit). */
export type VisitLineItem = { id: string; name: string; cost: string | null; costValue: number | null };
export type VisitMedicationItem = { id: string; name: string; dosage: string | null };
export type VisitIllnessItem = { id: string; name: string };

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
  illnesses: VisitIllnessItem[];
  medications: VisitMedicationItem[];
  /** Sum of every line item — computed and stored at write time (lib/actions/health.ts). */
  cost: string | null;
};

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
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
  const [{ data: visits }, { data: serviceRows }, { data: vaxRows }, { data: illnessRows }, { data: medRows }, who, provider] = await Promise.all([
    supabase
      .from("visits")
      .select("id, pet_id, provider_id, vet_name, visit_date, reason, cost, weight_kg, notes")
      .eq("tenant_id", tenantId)
      .order("visit_date", { ascending: false }),
    supabase.from("visit_services").select("id, visit_id, name, cost").eq("tenant_id", tenantId),
    supabase.from("vaccinations").select("id, visit_id, reason, cost").eq("tenant_id", tenantId).not("visit_id", "is", null),
    supabase.from("illnesses").select("id, visit_id, reason").eq("tenant_id", tenantId).not("visit_id", "is", null),
    supabase.from("medications").select("id, visit_id, name, dosage").eq("tenant_id", tenantId).not("visit_id", "is", null),
    whoResolver(supabase, tenantId),
    providerResolver(supabase, tenantId),
  ]);

  const servicesByVisit = new Map<string, VisitLineItem[]>();
  for (const r of serviceRows ?? []) {
    const list = servicesByVisit.get(r.visit_id) ?? [];
    list.push({ id: r.id, name: r.name, cost: formatCurrency(r.cost), costValue: r.cost });
    servicesByVisit.set(r.visit_id, list);
  }

  const vaxByVisit = new Map<string, VisitLineItem[]>();
  for (const r of vaxRows ?? []) {
    if (!r.visit_id) continue;
    const list = vaxByVisit.get(r.visit_id) ?? [];
    list.push({ id: r.id, name: r.reason, cost: formatCurrency(r.cost), costValue: r.cost });
    vaxByVisit.set(r.visit_id, list);
  }

  const illnessesByVisit = new Map<string, VisitIllnessItem[]>();
  for (const r of illnessRows ?? []) {
    if (!r.visit_id) continue;
    const list = illnessesByVisit.get(r.visit_id) ?? [];
    list.push({ id: r.id, name: r.reason });
    illnessesByVisit.set(r.visit_id, list);
  }

  const medicationsByVisit = new Map<string, VisitMedicationItem[]>();
  for (const r of medRows ?? []) {
    if (!r.visit_id) continue;
    const list = medicationsByVisit.get(r.visit_id) ?? [];
    list.push({ id: r.id, name: r.name, dosage: r.dosage });
    medicationsByVisit.set(r.visit_id, list);
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
    illnesses: illnessesByVisit.get(v.id) ?? [],
    medications: medicationsByVisit.get(v.id) ?? [],
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
      .select("id, pet_id, visit_id, diagnosed_date, reason, status, notes")
      .eq("tenant_id", tenantId)
      .order("diagnosed_date", { ascending: false }),
    whoResolver(supabase, tenantId),
  ]);

  return (data ?? []).map((v) => ({
    id: v.id,
    petId: v.pet_id,
    visitId: v.visit_id,
    date: fmtDate(v.diagnosed_date),
    dateIso: v.diagnosed_date,
    dueDateIso: null,
    who: who(v.pet_id),
    reason: v.reason,
    provider: null,
    providerId: null,
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
  const [{ data }, { data: visitRows }, who, provider] = await Promise.all([
    supabase
      .from("vaccinations")
      .select("id, pet_id, visit_id, provider_id, due_date, administered_date, reason, status, cost, notes")
      .eq("tenant_id", tenantId)
      .order("due_date", { ascending: false, nullsFirst: false }),
    supabase.from("visits").select("id, provider_id").eq("tenant_id", tenantId),
    whoResolver(supabase, tenantId),
    providerResolver(supabase, tenantId),
  ]);

  // A vaccination given during a visit shows that visit's own clinic —
  // it isn't (and shouldn't be) stored redundantly on the vaccination row
  // itself; only a direct (standalone) entry uses its own provider_id.
  const visitProviderById = new Map((visitRows ?? []).map((v) => [v.id, v.provider_id]));

  const statusLabel: Record<string, string> = { due: "Due", scheduled: "Scheduled", complete: "Complete" };

  return (data ?? []).map((v) => ({
    id: v.id,
    petId: v.pet_id,
    visitId: v.visit_id,
    date: fmtDate(v.administered_date ?? v.due_date ?? new Date().toISOString().slice(0, 10)),
    dateIso: v.administered_date ?? v.due_date ?? "",
    dueDateIso: v.due_date,
    who: who(v.pet_id),
    reason: v.reason,
    provider: provider(v.visit_id ? (visitProviderById.get(v.visit_id) ?? null) : v.provider_id),
    providerId: v.provider_id,
    cost: formatCurrency(v.cost),
    status: statusLabel[v.status] ?? v.status,
    statusRaw: v.status,
    notes: v.notes,
  }));
}
