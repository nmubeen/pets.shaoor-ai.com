"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProtocols, dueDateFor } from "@/lib/protocols";
import type { SpeciesGroup } from "@/lib/database.types";

type Supa = Awaited<ReturnType<typeof createClient>>;

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function num(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Health records are pet-only (0017_scope_rework.sql) — reads the PetPicker's plain "pet_id" field. */
function requirePetId(formData: FormData): string | { error: string } {
  const petId = str(formData, "pet_id");
  return petId ?? { error: "Choose which pet this is about." };
}

function revalidateHealth() {
  revalidatePath("/app");
  revalidatePath("/app/health");
}

/** Reads a repeated pair of same-named inputs (one row = one name + one cost, in DOM order) into rows, dropping blank-name rows. */
function readRows(formData: FormData, nameField: string, costField: string): { name: string; cost: number | null }[] {
  const names = formData.getAll(nameField);
  const costs = formData.getAll(costField);
  const rows: { name: string; cost: number | null }[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = typeof names[i] === "string" ? (names[i] as string).trim() : "";
    if (!name) continue;
    const rawCost = typeof costs[i] === "string" ? (costs[i] as string).trim() : "";
    const cost = rawCost ? Number(rawCost) : null;
    rows.push({ name, cost: cost !== null && Number.isFinite(cost) ? cost : null });
  }
  return rows;
}

/**
 * Finds a tenant's service catalog entry by name (case-insensitive),
 * creating it if new — same "type it, it gets added" pattern as
 * lib/actions/shopping.ts's findOrCreateProduct. Species-aware
 * (0021_service_type_species.sql): frequency often differs by species
 * (Deworming every 30 days for a dog, 60 for a cat), so an exact
 * species_group match is preferred over a generic (null) one, and a
 * brand-new entry is tagged with the visited pet's species rather than
 * left generic — a user who really wants it to apply to any species can
 * still clear that in Settings.
 */
async function findOrCreateServiceType(
  supabase: Supa,
  tenantId: string,
  name: string,
  petSpeciesGroup: SpeciesGroup | null
): Promise<{ id: string; frequencyDays: number | null } | null> {
  const { data: candidates } = await supabase
    .from("care_service_types")
    .select("id, frequency_days, species_group")
    .eq("tenant_id", tenantId)
    .ilike("name", name);

  const exact = candidates?.find((c) => c.species_group === petSpeciesGroup);
  const generic = candidates?.find((c) => c.species_group === null);
  const existing = exact ?? generic;
  if (existing) return { id: existing.id, frequencyDays: existing.frequency_days };

  const { data: created, error } = await supabase
    .from("care_service_types")
    .insert({ tenant_id: tenantId, name, species_group: petSpeciesGroup })
    .select("id, frequency_days")
    .single();
  if (error || !created) return null;
  return { id: created.id, frequencyDays: created.frequency_days };
}

/**
 * A service with a configured frequency (Deworming every 30 days, Nail
 * Clipping every 20) drives a care_task reminder — logging it here
 * completes whatever open reminder already existed for this pet+service
 * (it just got done, hence why it's being logged) and schedules the next
 * one, same "complete a recurring thing, get the next one" shape as
 * lib/actions/tasks.ts's completeCareTask. A service with no frequency
 * (e.g. Consultation) is just a line item, no task involved.
 */
async function upsertServiceReminder(
  supabase: Supa,
  tenantId: string,
  petId: string,
  serviceName: string,
  frequencyDays: number | null,
  visitDate: string
) {
  if (!frequencyDays) return;

  await supabase
    .from("care_tasks")
    .update({ completed_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("pet_id", petId)
    .eq("title", serviceName)
    .is("completed_at", null);

  const next = new Date(visitDate + "T00:00:00Z");
  next.setUTCDate(next.getUTCDate() + frequencyDays);
  await supabase.from("care_tasks").insert({
    tenant_id: tenantId,
    pet_id: petId,
    title: serviceName,
    due_date: next.toISOString().slice(0, 10),
    repeat_interval_days: frequencyDays,
  });
}

/**
 * Shared by markVaccinationGiven and recordVaccinationGiven (below) — if
 * the vaccination came from a protocol step with a recurring booster
 * interval, schedules the next occurrence dated from the actual
 * administered date. UTC-safe date math — see completeCareTask's comment
 * for why mixing local Date parsing with toISOString() output silently
 * shifts dates by a day on some servers.
 */
async function scheduleBoosterIfDue(
  supabase: Supa,
  tenantId: string,
  vax: { pet_id: string; protocol_id: string | null; reason: string },
  administeredDate: string
) {
  if (!vax.protocol_id) return { error: null };

  const { data: protocol } = await supabase
    .from("vaccine_protocols")
    .select("booster_interval_months")
    .eq("id", vax.protocol_id)
    .maybeSingle();
  if (!protocol?.booster_interval_months) return { error: null };

  const next = new Date(administeredDate + "T00:00:00Z");
  next.setUTCMonth(next.getUTCMonth() + protocol.booster_interval_months);
  const { error } = await supabase.from("vaccinations").insert({
    tenant_id: tenantId,
    pet_id: vax.pet_id,
    protocol_id: vax.protocol_id,
    reason: vax.reason,
    status: "due",
    due_date: next.toISOString().slice(0, 10),
  });
  return { error: error?.message ?? null };
}

/**
 * Records a vaccine given during a visit. Matches it against the pet's
 * open (not-yet-complete) vaccinations by name first — completing the
 * schedule's own "due" row rather than creating a disconnected duplicate
 * when the vaccine was already anticipated; falls back to inserting a
 * fresh already-complete row for anything ad hoc / unscheduled.
 */
async function recordVaccinationGiven(
  supabase: Supa,
  tenantId: string,
  petId: string,
  visitId: string,
  name: string,
  cost: number | null,
  administeredDate: string
): Promise<{ error: string | null }> {
  const { data: due } = await supabase
    .from("vaccinations")
    .select("id, pet_id, protocol_id, reason")
    .eq("tenant_id", tenantId)
    .eq("pet_id", petId)
    .neq("status", "complete")
    .ilike("reason", name)
    .maybeSingle();

  if (due) {
    const { error } = await supabase
      .from("vaccinations")
      .update({ status: "complete", administered_date: administeredDate, visit_id: visitId, cost })
      .eq("id", due.id);
    if (error) return { error: error.message };
    return scheduleBoosterIfDue(supabase, tenantId, due, administeredDate);
  }

  const { error } = await supabase.from("vaccinations").insert({
    tenant_id: tenantId,
    pet_id: petId,
    visit_id: visitId,
    reason: name,
    status: "complete",
    administered_date: administeredDate,
    cost,
  });
  return { error: error?.message ?? null };
}

/**
 * Logs one real-world visit, which may carry any mix of services (a
 * checkup, a grooming session, whatever actually happened) and vaccines
 * given — one form, one entry, regardless of how many different things
 * were done. The visit's cost is the sum of every line item entered here,
 * computed and stored now rather than recomputed later (there's no "edit
 * a visit's services" flow yet, so this is a write-time snapshot, not a
 * live trigger).
 */
export async function addVisit(tenantId: string, formData: FormData) {
  const petId = requirePetId(formData);
  if (typeof petId !== "string") return petId;
  const reason = str(formData, "reason");
  if (!reason) return { error: "Reason is required." };

  const visitDate = str(formData, "visit_date") ?? new Date().toISOString().slice(0, 10);
  const services = readRows(formData, "service_name", "service_cost");
  const vaccines = readRows(formData, "vaccine_name", "vaccine_cost");
  const totalCost =
    services.reduce((sum, r) => sum + (r.cost ?? 0), 0) + vaccines.reduce((sum, r) => sum + (r.cost ?? 0), 0);

  const supabase = await createClient();
  const { data: pet } = await supabase.from("pets").select("species_group").eq("id", petId).eq("tenant_id", tenantId).maybeSingle();
  const petSpeciesGroup = pet?.species_group ?? null;

  const { data: visit, error } = await supabase
    .from("visits")
    .insert({
      tenant_id: tenantId,
      pet_id: petId,
      provider_id: str(formData, "provider_id"),
      vet_name: str(formData, "vet_name"),
      visit_date: visitDate,
      reason,
      weight_kg: num(formData, "weight_kg"),
      notes: str(formData, "notes"),
      cost: services.length + vaccines.length > 0 ? totalCost : null,
    })
    .select("id")
    .single();
  if (error || !visit) return { error: error?.message ?? "Could not save that visit." };

  for (const s of services) {
    const serviceType = await findOrCreateServiceType(supabase, tenantId, s.name, petSpeciesGroup);
    const { error: insertError } = await supabase.from("visit_services").insert({
      tenant_id: tenantId,
      visit_id: visit.id,
      service_type_id: serviceType?.id ?? null,
      name: s.name,
      cost: s.cost,
    });
    if (insertError) return { error: insertError.message };
    if (serviceType) await upsertServiceReminder(supabase, tenantId, petId, s.name, serviceType.frequencyDays, visitDate);
  }

  for (const v of vaccines) {
    const { error: vaxError } = await recordVaccinationGiven(supabase, tenantId, petId, visit.id, v.name, v.cost, visitDate);
    if (vaxError) return { error: vaxError };
  }

  revalidateHealth();
  return { error: null };
}

export async function addIllness(tenantId: string, formData: FormData) {
  const petId = requirePetId(formData);
  if (typeof petId !== "string") return petId;
  const reason = str(formData, "reason");
  if (!reason) return { error: "Description is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("illnesses").insert({
    tenant_id: tenantId,
    pet_id: petId,
    reason,
    status: str(formData, "status") === "resolved" ? "resolved" : "active",
    diagnosed_date: str(formData, "diagnosed_date") ?? new Date().toISOString().slice(0, 10),
    notes: str(formData, "notes"),
  });
  if (error) return { error: error.message };

  revalidateHealth();
  return { error: null };
}

export async function addVaccination(tenantId: string, formData: FormData) {
  const petId = requirePetId(formData);
  if (typeof petId !== "string") return petId;
  const reason = str(formData, "reason");
  if (!reason) return { error: "Vaccine name is required." };

  const status = str(formData, "status");
  const validStatus = status === "scheduled" || status === "complete" ? status : "due";

  const supabase = await createClient();
  const { error } = await supabase.from("vaccinations").insert({
    tenant_id: tenantId,
    pet_id: petId,
    reason,
    status: validStatus,
    due_date: str(formData, "due_date"),
    administered_date: validStatus === "complete" ? (str(formData, "due_date") ?? new Date().toISOString().slice(0, 10)) : null,
    notes: str(formData, "notes"),
  });
  if (error) return { error: error.message };

  revalidateHealth();
  return { error: null };
}

/**
 * Generates the missing vaccination steps from the species' standard
 * protocol — the "predictive" part: turns a birth date into a concrete,
 * due-dated schedule instead of requiring the owner to know it themselves.
 * Pulls both the global dog/cat defaults and this workspace's own custom
 * vaccination plan entries (Settings → Care) — RLS returns both for the
 * same species_group query, no code-level union needed. Safe to call more
 * than once — steps already generated (matched by protocol_id) aren't
 * duplicated. Every row it creates is a normal, freely-editable
 * vaccination row afterward, same as one logged by hand.
 */
export async function generateVaccinationSchedule(tenantId: string, petId: string) {
  const supabase = await createClient();

  const { data: pet } = await supabase
    .from("pets")
    .select("species_group, birth_date")
    .eq("id", petId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!pet) return { error: "Pet not found.", generated: 0 };
  if (!pet.species_group) return { error: "Set this pet's species group first (edit the pet).", generated: 0 };
  if (!pet.birth_date) return { error: "Set this pet's birth date first (edit the pet).", generated: 0 };

  const [protocols, { data: existing }] = await Promise.all([
    getProtocols(supabase, pet.species_group),
    supabase.from("vaccinations").select("protocol_id").eq("tenant_id", tenantId).eq("pet_id", petId).not("protocol_id", "is", null),
  ]);
  if (protocols.length === 0) return { error: "No standard schedule available for this species yet.", generated: 0 };

  const already = new Set((existing ?? []).map((v) => v.protocol_id));
  const toInsert = protocols
    .filter((p) => !already.has(p.id))
    .map((p) => ({
      tenant_id: tenantId,
      pet_id: petId,
      protocol_id: p.id,
      reason: p.vaccineName,
      status: "due" as const,
      due_date: dueDateFor(pet.birth_date as string, p.ageWeeksDue),
    }));

  if (toInsert.length === 0) return { error: null, generated: 0 };

  const { error } = await supabase.from("vaccinations").insert(toInsert);
  if (error) return { error: error.message, generated: 0 };

  revalidateHealth();
  return { error: null, generated: toInsert.length };
}

/**
 * Marks a vaccination as given today (standalone — not tied to a visit;
 * use addVisit's "Vaccinations given" rows when it happened as part of a
 * logged visit). Schedules the next booster occurrence if applicable —
 * see scheduleBoosterIfDue.
 */
export async function markVaccinationGiven(tenantId: string, vaccinationId: string) {
  const supabase = await createClient();

  const { data: vax } = await supabase
    .from("vaccinations")
    .select("*")
    .eq("id", vaccinationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!vax) return { error: "Not found." };

  const administeredDate = new Date().toISOString().slice(0, 10);
  const { error: updateError } = await supabase
    .from("vaccinations")
    .update({ status: "complete", administered_date: administeredDate })
    .eq("id", vaccinationId)
    .eq("tenant_id", tenantId);
  if (updateError) return { error: updateError.message };

  const { error } = await scheduleBoosterIfDue(supabase, tenantId, vax, administeredDate);
  if (error) return { error };

  revalidateHealth();
  return { error: null };
}
