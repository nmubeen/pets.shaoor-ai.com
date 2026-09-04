import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getRoster } from "@/lib/roster";
import { getProviders } from "@/lib/providers";
import { pickScopeId } from "@/lib/scope";

export type MedicationRow = {
  id: string;
  name: string;
  dosage: string | null;
  who: string;
  frequencyDays: number;
  nextDueDate: string;
  nextDueLabel: string;
  overdue: boolean;
  endDate: string | null;
  provider: string | null;
  status: "active" | "completed" | "discontinued";
};

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" });
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
  const [{ data }, roster, providers] = await Promise.all([
    supabase
      .from("medications")
      .select(
        "id, pet_id, group_id, habitat_id, provider_id, name, dosage, frequency_days, end_date, next_due_date, status"
      )
      .eq("tenant_id", tenantId)
      .neq("status", "discontinued")
      .order("next_due_date"),
    getRoster(supabase, tenantId),
    getProviders(supabase, tenantId, ["vet"]),
  ]);

  const byId = new Map(roster.map((r) => [r.id, r.name]));
  const providerById = new Map(providers.map((p) => [p.id, p.name]));

  return (data ?? []).map((m) => {
    const scopeId = pickScopeId(m);
    const { label, overdue } = dueLabelFor(m.next_due_date);
    return {
      id: m.id,
      name: m.name,
      dosage: m.dosage,
      who: scopeId ? (byId.get(scopeId) ?? "Unknown") : "Household",
      frequencyDays: m.frequency_days,
      nextDueDate: m.next_due_date,
      nextDueLabel: label,
      overdue,
      endDate: m.end_date,
      provider: m.provider_id ? (providerById.get(m.provider_id) ?? null) : null,
      status: m.status,
    };
  });
}
