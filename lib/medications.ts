// Pet-only (0017_scope_rework.sql) — "who" is always pet_id.
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getProviders } from "@/lib/providers";

export type MedicationRow = {
  id: string;
  petId: string;
  /** Set when prescribed via a Visit's line items rather than added directly — Edit opens that visit instead, and Delete is disabled. */
  visitId: string | null;
  name: string;
  dosage: string | null;
  who: string;
  frequencyDays: number;
  startDate: string;
  nextDueDate: string;
  nextDueLabel: string;
  overdue: boolean;
  endDate: string | null;
  provider: string | null;
  providerId: string | null;
  notes: string | null;
  status: "active" | "completed" | "discontinued";
};

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

function dueLabelFor(nextDueDate: string): { label: string; overdue: boolean } {
  const days = Math.ceil((new Date(nextDueDate + "T00:00:00").getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `${-days}d overdue`, overdue: true };
  if (days === 0) return { label: "Due today", overdue: true };
  return { label: `Due in ${days}d (${fmtDate(nextDueDate)})`, overdue: false };
}

export async function getMedications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<MedicationRow[]> {
  const [{ data }, { data: pets }, providers] = await Promise.all([
    supabase
      .from("medications")
      .select("id, pet_id, visit_id, provider_id, name, dosage, frequency_days, start_date, end_date, next_due_date, notes, status")
      .eq("tenant_id", tenantId)
      .neq("status", "discontinued")
      .order("next_due_date"),
    supabase.from("pets").select("id, name").eq("tenant_id", tenantId),
    getProviders(supabase, tenantId, ["vet"]),
  ]);

  const byId = new Map((pets ?? []).map((p) => [p.id, p.name]));
  const providerById = new Map(providers.map((p) => [p.id, p.name]));

  return (data ?? []).map((m) => {
    const { label, overdue } = dueLabelFor(m.next_due_date);
    return {
      id: m.id,
      petId: m.pet_id,
      visitId: m.visit_id,
      name: m.name,
      dosage: m.dosage,
      who: byId.get(m.pet_id) ?? "Unknown",
      frequencyDays: m.frequency_days,
      startDate: m.start_date,
      nextDueDate: m.next_due_date,
      nextDueLabel: label,
      overdue,
      endDate: m.end_date,
      provider: m.provider_id ? (providerById.get(m.provider_id) ?? null) : null,
      providerId: m.provider_id,
      notes: m.notes,
      status: m.status,
    };
  });
}
