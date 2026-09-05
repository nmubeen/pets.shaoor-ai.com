"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProtocols, dueDateFor } from "@/lib/protocols";
import type { Species } from "@/lib/database.types";

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

/**
 * Reads a repeated set of same-named inputs (one row = one optional id +
 * one name + one optional cost, in DOM order — VisitForm's RowList emits
 * exactly this shape) into rows, dropping blank-name rows. `id` is only
 * present when editing an existing linked record (see updateVisit); a
 * brand-new row has none.
 */
function readRowsWithId(
  formData: FormData,
  idField: string,
  nameField: string,
  costField?: string
): { id: string | null; name: string; cost: number | null }[] {
  const ids = formData.getAll(idField);
  const names = formData.getAll(nameField);
  const costs = costField ? formData.getAll(costField) : [];
  const rows: { id: string | null; name: string; cost: number | null }[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = typeof names[i] === "string" ? (names[i] as string).trim() : "";
    if (!name) continue;
    const id = typeof ids[i] === "string" && (ids[i] as string).trim() ? (ids[i] as string).trim() : null;
    const rawCost = costField && typeof costs[i] === "string" ? (costs[i] as string).trim() : "";
    const cost = rawCost ? Number(rawCost) : null;
    rows.push({ id, name, cost: cost !== null && Number.isFinite(cost) ? cost : null });
  }
  return rows;
}

/** Same idea as readRowsWithId, but the second column is free text (dosage) rather than a numeric cost. */
function readMedicationRows(formData: FormData): { id: string | null; name: string; dosage: string | null }[] {
  const ids = formData.getAll("medication_id");
  const names = formData.getAll("medication_name");
  const dosages = formData.getAll("medication_dosage");
  const rows: { id: string | null; name: string; dosage: string | null }[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = typeof names[i] === "string" ? (names[i] as string).trim() : "";
    if (!name) continue;
    const id = typeof ids[i] === "string" && (ids[i] as string).trim() ? (ids[i] as string).trim() : null;
    const dosage = typeof dosages[i] === "string" && (dosages[i] as string).trim() ? (dosages[i] as string).trim() : null;
    rows.push({ id, name, dosage });
  }
  return rows;
}

/**
 * Finds a tenant's service catalog entry by name (case-insensitive),
 * creating it if new — same "type it, it gets added" pattern as
 * lib/actions/shopping.ts's findOrCreateProduct. Species-aware
 * (0021_service_type_species.sql, 0022_rename_species_breed.sql):
 * frequency often differs by species (Deworming every 30 days for a dog,
 * 60 for a cat), so an exact species match is preferred over a generic
 * (null) one, and a brand-new entry is tagged with the visited pet's
 * species rather than left generic — a user who really wants it to apply
 * to any species can still clear that in Settings.
 */
async function findOrCreateServiceType(
  supabase: Supa,
  tenantId: string,
  name: string,
  petSpecies: Species
): Promise<{ id: string; frequencyDays: number | null } | null> {
  const { data: candidates } = await supabase
    .from("care_service_types")
    .select("id, frequency_days, species")
    .eq("tenant_id", tenantId)
    .ilike("name", name);

  const exact = candidates?.find((c) => c.species === petSpecies);
  const generic = candidates?.find((c) => c.species === null);
  const existing = exact ?? generic;
  if (existing) return { id: existing.id, frequencyDays: existing.frequency_days };

  const { data: created, error } = await supabase
    .from("care_service_types")
    .insert({ tenant_id: tenantId, name, species: petSpecies })
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
 * checkup, a grooming session, whatever actually happened), vaccines
 * given, illnesses diagnosed, and medications prescribed — one form, one
 * entry, regardless of how many different things were done. The visit's
 * cost is the sum of every services/vaccinations line item entered here
 * (illnesses/medications don't carry a cost, matching their own
 * standalone forms), computed and stored now rather than recomputed
 * later. Illnesses/medications captured here are just real rows in those
 * tables with `visit_id` set — they show up in the Illnesses/Medications
 * lists exactly like a directly-logged entry, just linked back to this
 * visit (same pattern vaccinations given during a visit already used).
 */
export async function addVisit(tenantId: string, formData: FormData) {
  const petId = requirePetId(formData);
  if (typeof petId !== "string") return petId;
  const reason = str(formData, "reason");
  if (!reason) return { error: "Reason is required." };

  const visitDate = str(formData, "visit_date") ?? new Date().toISOString().slice(0, 10);
  const providerId = str(formData, "provider_id");
  const services = readRowsWithId(formData, "service_id", "service_name", "service_cost");
  const vaccines = readRowsWithId(formData, "vaccine_id", "vaccine_name", "vaccine_cost");
  const illnessRows = readRowsWithId(formData, "illness_id", "illness_name");
  const medRows = readMedicationRows(formData);
  const totalCost =
    services.reduce((sum, r) => sum + (r.cost ?? 0), 0) + vaccines.reduce((sum, r) => sum + (r.cost ?? 0), 0);

  const supabase = await createClient();
  const { data: pet } = await supabase.from("pets").select("species").eq("id", petId).eq("tenant_id", tenantId).maybeSingle();
  if (!pet) return { error: "Pet not found." };

  const { data: visit, error } = await supabase
    .from("visits")
    .insert({
      tenant_id: tenantId,
      pet_id: petId,
      provider_id: providerId,
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
    const serviceType = await findOrCreateServiceType(supabase, tenantId, s.name, pet.species);
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

  for (const i of illnessRows) {
    const { error: illnessError } = await supabase.from("illnesses").insert({
      tenant_id: tenantId,
      pet_id: petId,
      visit_id: visit.id,
      reason: i.name,
      status: "active",
      diagnosed_date: visitDate,
    });
    if (illnessError) return { error: illnessError.message };
  }

  for (const m of medRows) {
    const { error: medError } = await supabase.from("medications").insert({
      tenant_id: tenantId,
      pet_id: petId,
      visit_id: visit.id,
      provider_id: providerId,
      name: m.name,
      dosage: m.dosage,
      start_date: visitDate,
      next_due_date: visitDate,
    });
    if (medError) return { error: medError.message };
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
    provider_id: str(formData, "provider_id"),
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
 * same species query, no code-level union needed. Safe to call more than
 * once — steps already generated (matched by protocol_id) aren't
 * duplicated. Every row it creates is a normal, freely-editable
 * vaccination row afterward, same as one logged by hand.
 */
export async function generateVaccinationSchedule(tenantId: string, petId: string) {
  const supabase = await createClient();

  const { data: pet } = await supabase
    .from("pets")
    .select("species, birth_date")
    .eq("id", petId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!pet) return { error: "Pet not found.", generated: 0 };
  if (!pet.birth_date) return { error: "Set this pet's birth date first (edit the pet).", generated: 0 };

  const [protocols, { data: existing }] = await Promise.all([
    getProtocols(supabase, pet.species),
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

/**
 * Edits a visit — its own fields (pet, reason, provider, doctor, date,
 * weight, notes) plus every line item, diffed against what's already
 * linked to it rather than blindly deleted-and-reinserted:
 * - unchanged rows (same id, same values) are left alone entirely — no
 *   writes, no side effects;
 * - changed rows (same id, different name/cost/dosage) get a plain field
 *   UPDATE by id — never re-running reminder scheduling
 *   (upsertServiceReminder) or due-vaccination matching
 *   (recordVaccinationGiven), which already ran once at creation; doing
 *   it again on every edit would push reminders forward or create
 *   duplicate bookings every time someone just fixes a typo;
 * - new rows (no id) are inserted exactly like addVisit would, full side
 *   effects included — this genuinely is a new thing being added;
 * - rows removed from the form: for services (visit_services, no
 *   independent lifecycle of their own) this deletes them outright; for
 *   vaccinations/illnesses/medications (real records with their own
 *   history/schedule) this only unlinks them (visit_id = null) rather
 *   than deleting — the record survives as a direct entry instead of a
 *   visit-given one.
 */
export async function updateVisit(tenantId: string, visitId: string, formData: FormData) {
  const petId = requirePetId(formData);
  if (typeof petId !== "string") return petId;
  const reason = str(formData, "reason");
  if (!reason) return { error: "Reason is required." };

  const visitDate = str(formData, "visit_date") ?? new Date().toISOString().slice(0, 10);
  const providerId = str(formData, "provider_id");
  const services = readRowsWithId(formData, "service_id", "service_name", "service_cost");
  const vaccines = readRowsWithId(formData, "vaccine_id", "vaccine_name", "vaccine_cost");
  const illnessRows = readRowsWithId(formData, "illness_id", "illness_name");
  const medRows = readMedicationRows(formData);
  const totalCost =
    services.reduce((sum, r) => sum + (r.cost ?? 0), 0) + vaccines.reduce((sum, r) => sum + (r.cost ?? 0), 0);

  const supabase = await createClient();
  const { data: pet } = await supabase.from("pets").select("species").eq("id", petId).eq("tenant_id", tenantId).maybeSingle();
  if (!pet) return { error: "Pet not found." };

  const { error } = await supabase
    .from("visits")
    .update({
      pet_id: petId,
      provider_id: providerId,
      vet_name: str(formData, "vet_name"),
      visit_date: visitDate,
      reason,
      weight_kg: num(formData, "weight_kg"),
      notes: str(formData, "notes"),
      cost: services.length + vaccines.length > 0 ? totalCost : null,
    })
    .eq("id", visitId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  // --- Services: no independent lifecycle — safe to delete removed rows outright. ---
  const { data: existingServices } = await supabase.from("visit_services").select("id, name, cost").eq("visit_id", visitId).eq("tenant_id", tenantId);
  const submittedServiceIds = new Set(services.filter((s) => s.id).map((s) => s.id));
  const removedServiceIds = (existingServices ?? []).filter((s) => !submittedServiceIds.has(s.id)).map((s) => s.id);
  if (removedServiceIds.length > 0) await supabase.from("visit_services").delete().in("id", removedServiceIds);
  for (const s of services) {
    if (s.id) {
      const original = existingServices?.find((e) => e.id === s.id);
      if (original && (original.name !== s.name || original.cost !== s.cost)) {
        const { error: updateError } = await supabase.from("visit_services").update({ name: s.name, cost: s.cost }).eq("id", s.id);
        if (updateError) return { error: updateError.message };
      }
    } else {
      const serviceType = await findOrCreateServiceType(supabase, tenantId, s.name, pet.species);
      const { error: insertError } = await supabase.from("visit_services").insert({
        tenant_id: tenantId,
        visit_id: visitId,
        service_type_id: serviceType?.id ?? null,
        name: s.name,
        cost: s.cost,
      });
      if (insertError) return { error: insertError.message };
      if (serviceType) await upsertServiceReminder(supabase, tenantId, petId, s.name, serviceType.frequencyDays, visitDate);
    }
  }

  // --- Vaccinations given: real records with their own schedule — unlink removed rows, never delete. ---
  const { data: existingVax } = await supabase.from("vaccinations").select("id, reason, cost").eq("visit_id", visitId).eq("tenant_id", tenantId);
  const submittedVaxIds = new Set(vaccines.filter((v) => v.id).map((v) => v.id));
  const removedVaxIds = (existingVax ?? []).filter((v) => !submittedVaxIds.has(v.id)).map((v) => v.id);
  if (removedVaxIds.length > 0) await supabase.from("vaccinations").update({ visit_id: null }).in("id", removedVaxIds);
  for (const v of vaccines) {
    if (v.id) {
      const original = existingVax?.find((e) => e.id === v.id);
      if (original && (original.reason !== v.name || original.cost !== v.cost)) {
        const { error: updateError } = await supabase.from("vaccinations").update({ reason: v.name, cost: v.cost }).eq("id", v.id);
        if (updateError) return { error: updateError.message };
      }
    } else {
      const { error: vaxError } = await recordVaccinationGiven(supabase, tenantId, petId, visitId, v.name, v.cost, visitDate);
      if (vaxError) return { error: vaxError };
    }
  }

  // --- Illnesses diagnosed: unlink removed rows, never delete. ---
  const { data: existingIllness } = await supabase.from("illnesses").select("id, reason").eq("visit_id", visitId).eq("tenant_id", tenantId);
  const submittedIllnessIds = new Set(illnessRows.filter((i) => i.id).map((i) => i.id));
  const removedIllnessIds = (existingIllness ?? []).filter((i) => !submittedIllnessIds.has(i.id)).map((i) => i.id);
  if (removedIllnessIds.length > 0) await supabase.from("illnesses").update({ visit_id: null }).in("id", removedIllnessIds);
  for (const i of illnessRows) {
    if (i.id) {
      const original = existingIllness?.find((e) => e.id === i.id);
      if (original && original.reason !== i.name) {
        const { error: updateError } = await supabase.from("illnesses").update({ reason: i.name }).eq("id", i.id);
        if (updateError) return { error: updateError.message };
      }
    } else {
      const { error: insertError } = await supabase.from("illnesses").insert({
        tenant_id: tenantId,
        pet_id: petId,
        visit_id: visitId,
        reason: i.name,
        status: "active",
        diagnosed_date: visitDate,
      });
      if (insertError) return { error: insertError.message };
    }
  }

  // --- Medications prescribed: unlink removed rows, never delete. ---
  const { data: existingMeds } = await supabase.from("medications").select("id, name, dosage").eq("visit_id", visitId).eq("tenant_id", tenantId);
  const submittedMedIds = new Set(medRows.filter((m) => m.id).map((m) => m.id));
  const removedMedIds = (existingMeds ?? []).filter((m) => !submittedMedIds.has(m.id)).map((m) => m.id);
  if (removedMedIds.length > 0) await supabase.from("medications").update({ visit_id: null }).in("id", removedMedIds);
  for (const m of medRows) {
    if (m.id) {
      const original = existingMeds?.find((e) => e.id === m.id);
      if (original && (original.name !== m.name || original.dosage !== m.dosage)) {
        const { error: updateError } = await supabase.from("medications").update({ name: m.name, dosage: m.dosage }).eq("id", m.id);
        if (updateError) return { error: updateError.message };
      }
    } else {
      const { error: insertError } = await supabase.from("medications").insert({
        tenant_id: tenantId,
        pet_id: petId,
        visit_id: visitId,
        provider_id: providerId,
        name: m.name,
        dosage: m.dosage,
        start_date: visitDate,
        next_due_date: visitDate,
      });
      if (insertError) return { error: insertError.message };
    }
  }

  revalidateHealth();
  return { error: null };
}

/** Deletes a visit. visit_services cascades away; any vaccination given during it just loses the visit_id link (on delete set null) — its own record (and history) stays intact. */
export async function deleteVisit(tenantId: string, visitId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("visits").delete().eq("id", visitId).eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidateHealth();
  return { error: null };
}

export async function updateIllness(tenantId: string, illnessId: string, formData: FormData) {
  const petId = requirePetId(formData);
  if (typeof petId !== "string") return petId;
  const reason = str(formData, "reason");
  if (!reason) return { error: "Description is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("illnesses")
    .update({
      pet_id: petId,
      reason,
      status: str(formData, "status") === "resolved" ? "resolved" : "active",
      diagnosed_date: str(formData, "diagnosed_date") ?? new Date().toISOString().slice(0, 10),
      notes: str(formData, "notes"),
    })
    .eq("id", illnessId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidateHealth();
  return { error: null };
}

/** Entries captured via a visit can only be removed by editing that visit (unlinking or deleting it there) — never directly, so the visit's own line-item list stays truthful. Mirrors deleteVaccination/deleteMedication. */
export async function deleteIllness(tenantId: string, illnessId: string) {
  const supabase = await createClient();
  const { data: illness } = await supabase.from("illnesses").select("visit_id").eq("id", illnessId).eq("tenant_id", tenantId).maybeSingle();
  if (!illness) return { error: "Not found." };
  if (illness.visit_id) return { error: "This was logged as part of a visit — edit that visit to change or remove it." };

  const { error } = await supabase.from("illnesses").delete().eq("id", illnessId).eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidateHealth();
  return { error: null };
}

export async function updateVaccination(tenantId: string, vaccinationId: string, formData: FormData) {
  const petId = requirePetId(formData);
  if (typeof petId !== "string") return petId;
  const reason = str(formData, "reason");
  if (!reason) return { error: "Vaccine name is required." };

  const status = str(formData, "status");
  const validStatus = status === "scheduled" || status === "complete" ? status : "due";
  const dueDate = str(formData, "due_date");

  const supabase = await createClient();
  const { error } = await supabase
    .from("vaccinations")
    .update({
      pet_id: petId,
      provider_id: str(formData, "provider_id"),
      reason,
      status: validStatus,
      due_date: dueDate,
      administered_date: validStatus === "complete" ? (dueDate ?? new Date().toISOString().slice(0, 10)) : null,
      notes: str(formData, "notes"),
    })
    .eq("id", vaccinationId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidateHealth();
  return { error: null };
}

/** Entries given during a visit can only be removed by editing that visit — see deleteIllness's comment. */
export async function deleteVaccination(tenantId: string, vaccinationId: string) {
  const supabase = await createClient();
  const { data: vax } = await supabase.from("vaccinations").select("visit_id").eq("id", vaccinationId).eq("tenant_id", tenantId).maybeSingle();
  if (!vax) return { error: "Not found." };
  if (vax.visit_id) return { error: "This was logged as part of a visit — edit that visit to change or remove it." };

  const { error } = await supabase.from("vaccinations").delete().eq("id", vaccinationId).eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidateHealth();
  return { error: null };
}
