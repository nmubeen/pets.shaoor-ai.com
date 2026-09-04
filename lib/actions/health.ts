"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProtocols, dueDateFor } from "@/lib/protocols";

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

export async function addVetVisit(tenantId: string, formData: FormData) {
  const petId = requirePetId(formData);
  if (typeof petId !== "string") return petId;
  const reason = str(formData, "reason");
  if (!reason) return { error: "Reason is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("vet_visits").insert({
    tenant_id: tenantId,
    pet_id: petId,
    provider_id: str(formData, "provider_id"),
    visit_date: str(formData, "visit_date") ?? new Date().toISOString().slice(0, 10),
    reason,
    vet_name: str(formData, "vet_name"),
    cost: num(formData, "cost"),
    weight_kg: num(formData, "weight_kg"),
    notes: str(formData, "notes"),
  });
  if (error) return { error: error.message };

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
 * Safe to call more than once — steps already generated (matched by
 * protocol_id) aren't duplicated. Every row it creates is a normal,
 * freely-editable vaccination row afterward, same as one logged by hand.
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
 * Marks a vaccination as given today. If it came from a protocol step that
 * carries a recurring booster interval, immediately schedules the next
 * occurrence — same "complete a recurring thing, get the next one" pattern
 * as lib/actions/tasks.ts's completeCareTask, including the UTC-safe date
 * math (see that file's comment for why mixing local Date parsing with
 * toISOString() output silently shifts dates by a day on some servers).
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

  if (vax.protocol_id) {
    const { data: protocol } = await supabase
      .from("vaccine_protocols")
      .select("booster_interval_months")
      .eq("id", vax.protocol_id)
      .maybeSingle();

    if (protocol?.booster_interval_months) {
      const next = new Date(administeredDate + "T00:00:00Z");
      next.setUTCMonth(next.getUTCMonth() + protocol.booster_interval_months);
      const { error: insertError } = await supabase.from("vaccinations").insert({
        tenant_id: tenantId,
        pet_id: vax.pet_id,
        protocol_id: vax.protocol_id,
        reason: vax.reason,
        status: "due",
        due_date: next.toISOString().slice(0, 10),
      });
      if (insertError) return { error: insertError.message };
    }
  }

  revalidateHealth();
  return { error: null };
}

export async function addGroomingVisit(tenantId: string, formData: FormData) {
  const petId = requirePetId(formData);
  if (typeof petId !== "string") return petId;
  const service = str(formData, "service");
  if (!service) return { error: "Service is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("grooming_visits").insert({
    tenant_id: tenantId,
    pet_id: petId,
    provider_id: str(formData, "provider_id"),
    service,
    visit_date: str(formData, "visit_date") ?? new Date().toISOString().slice(0, 10),
    cost: num(formData, "cost"),
    weight_kg: num(formData, "weight_kg"),
    notes: str(formData, "notes"),
  });
  if (error) return { error: error.message };

  revalidateHealth();
  return { error: null };
}
