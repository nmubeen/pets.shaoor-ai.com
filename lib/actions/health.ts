"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseScopeRequired } from "@/lib/scope";

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
function scope(formData: FormData) {
  return parseScopeRequired(str(formData, "scope"));
}

function revalidateHealth() {
  revalidatePath("/app");
  revalidatePath("/app/health");
}

export async function addVetVisit(tenantId: string, formData: FormData) {
  const s = scope(formData);
  if ("error" in s) return s;
  const reason = str(formData, "reason");
  if (!reason) return { error: "Reason is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("vet_visits").insert({
    tenant_id: tenantId,
    provider_id: str(formData, "provider_id"),
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
    provider_id: str(formData, "provider_id"),
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
