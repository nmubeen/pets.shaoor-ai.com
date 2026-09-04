"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RosterKind } from "@/lib/database.types";

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

/** Reads the "scope" field a ScopePicker form always includes, formatted "kind:id". */
function scope(
  formData: FormData
): { pet_id: string | null; group_id: string | null; habitat_id: string | null } | { error: string } {
  const raw = str(formData, "scope");
  const [kind, id] = raw?.split(":") ?? [];
  if (!kind || !id || !["pet", "group", "habitat"].includes(kind)) {
    return { error: "Choose who this is about." };
  }
  const rosterKind = kind as RosterKind;
  return {
    pet_id: rosterKind === "pet" ? id : null,
    group_id: rosterKind === "group" ? id : null,
    habitat_id: rosterKind === "habitat" ? id : null,
  };
}

function revalidateHealth() {
  revalidatePath("/app");
  revalidatePath("/app/health");
}

/** Finds a vet by name for this tenant, creating it if it doesn't exist yet. */
async function findOrCreateVetId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  name: string | null
): Promise<string | null> {
  if (!name) return null;
  const { data: existing } = await supabase
    .from("vets")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("vets")
    .insert({ tenant_id: tenantId, name })
    .select("id")
    .single();
  if (error) return null;
  return created.id;
}

export async function addVetVisit(tenantId: string, formData: FormData) {
  const s = scope(formData);
  if ("error" in s) return s;
  const reason = str(formData, "reason");
  if (!reason) return { error: "Reason is required." };

  const supabase = await createClient();
  const vetId = await findOrCreateVetId(supabase, tenantId, str(formData, "vet_name"));

  const { error } = await supabase.from("vet_visits").insert({
    tenant_id: tenantId,
    vet_id: vetId,
    visit_date: str(formData, "visit_date") ?? new Date().toISOString().slice(0, 10),
    reason,
    cost: num(formData, "cost"),
    notes: str(formData, "notes"),
    ...s,
  });
  if (error) return { error: error.message };

  revalidateHealth();
  return { error: null };
}

export async function addIllness(tenantId: string, formData: FormData) {
  const s = scope(formData);
  if ("error" in s) return s;
  const reason = str(formData, "reason");
  if (!reason) return { error: "Description is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("illnesses").insert({
    tenant_id: tenantId,
    reason,
    status: str(formData, "status") === "resolved" ? "resolved" : "active",
    diagnosed_date: str(formData, "diagnosed_date") ?? new Date().toISOString().slice(0, 10),
    notes: str(formData, "notes"),
    ...s,
  });
  if (error) return { error: error.message };

  revalidateHealth();
  return { error: null };
}

export async function addVaccination(tenantId: string, formData: FormData) {
  const s = scope(formData);
  if ("error" in s) return s;
  const reason = str(formData, "reason");
  if (!reason) return { error: "Vaccine name is required." };

  const status = str(formData, "status");
  const validStatus = status === "scheduled" || status === "complete" ? status : "due";

  const supabase = await createClient();
  const { error } = await supabase.from("vaccinations").insert({
    tenant_id: tenantId,
    reason,
    status: validStatus,
    due_date: str(formData, "due_date"),
    administered_date: validStatus === "complete" ? (str(formData, "due_date") ?? new Date().toISOString().slice(0, 10)) : null,
    notes: str(formData, "notes"),
    ...s,
  });
  if (error) return { error: error.message };

  revalidateHealth();
  return { error: null };
}

export async function addGroomingVisit(tenantId: string, formData: FormData) {
  const s = scope(formData);
  if ("error" in s) return s;
  const service = str(formData, "service");
  if (!service) return { error: "Service is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("grooming_visits").insert({
    tenant_id: tenantId,
    service,
    visit_date: str(formData, "visit_date") ?? new Date().toISOString().slice(0, 10),
    cost: num(formData, "cost"),
    notes: str(formData, "notes"),
    ...s,
  });
  if (error) return { error: error.message };

  revalidateHealth();
  return { error: null };
}
