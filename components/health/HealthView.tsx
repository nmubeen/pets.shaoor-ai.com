"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { LogHealthForm, type HealthTabKey } from "@/components/health/LogHealthForm";
import { PetFilterSelect } from "@/components/health/PetFilterSelect";
import { VisitsPanel } from "@/components/health/VisitsPanel";
import { MedicationsPanel } from "@/components/health/MedicationsPanel";
import { GrowthPanel } from "@/components/health/GrowthPanel";
import { markVaccinationGiven, deleteIllness, deleteVaccination } from "@/lib/actions/health";
import type { HealthRow, VisitRow } from "@/lib/health";
import type { MedicationRow } from "@/lib/medications";
import type { PetWeightHistory } from "@/lib/growth";
import type { RosterItem } from "@/lib/roster";
import type { Provider } from "@/lib/providers";
import type { ServiceType } from "@/lib/care-services";
import type { MembershipRole } from "@/lib/database.types";

type TabKey = "visits" | HealthTabKey | "medications" | "growth";

const TABS: { key: TabKey; label: string; logLabel: string }[] = [
  { key: "visits", label: "Visits", logLabel: "" },
  { key: "illnesses", label: "Illnesses", logLabel: "Log an illness" },
  { key: "vaccinations", label: "Vaccinations", logLabel: "Log a vaccination" },
  { key: "medications", label: "Medications", logLabel: "Add medication" },
  { key: "growth", label: "Growth", logLabel: "" },
];

function MarkGivenButton({ tenantId, vaccinationId }: { tenantId: string; vaccinationId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markVaccinationGiven(tenantId, vaccinationId);
          router.refresh();
        })
      }
      className="text-xs text-muted hover:text-good border border-line rounded-md px-2 py-1 transition disabled:opacity-60"
    >
      {pending ? "…" : "Mark given"}
    </button>
  );
}

function RowActions({
  tenantId,
  tab,
  rowId,
  onEdit,
}: {
  tenantId: string;
  tab: HealthTabKey;
  rowId: string;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const deleteAction = tab === "illnesses" ? deleteIllness : deleteVaccination;
  const confirmLabel = tab === "illnesses" ? "Delete this illness record?" : "Delete this vaccination record?";

  return (
    <div className="flex items-center gap-2">
      <button onClick={onEdit} className="text-xs text-muted hover:text-ink border border-line rounded-md px-2 py-1 transition">
        Edit
      </button>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (!confirm(confirmLabel)) return;
            await deleteAction(tenantId, rowId);
            router.refresh();
          })
        }
        className="text-xs text-muted hover:text-coral border border-line rounded-md px-2 py-1 transition disabled:opacity-60"
      >
        {pending ? "…" : "Delete"}
      </button>
    </div>
  );
}

export function HealthView({
  tenantId,
  role,
  roster,
  visitProviders,
  vetProviders,
  visits,
  illnesses,
  vaccinations,
  medications,
  weightHistory,
  serviceTypes,
  dueVaccinationNames,
}: {
  tenantId: string;
  role: MembershipRole;
  roster: RosterItem[];
  /** Vet + grooming providers combined — a visit could be to either. */
  visitProviders: Provider[];
  /** Vet-only — Medications' "Prescribed by" shouldn't offer a groomer. */
  vetProviders: Provider[];
  visits: VisitRow[];
  illnesses: HealthRow[];
  vaccinations: HealthRow[];
  medications: MedicationRow[];
  weightHistory: PetWeightHistory[];
  serviceTypes: ServiceType[];
  dueVaccinationNames: string[];
}) {
  const canWrite = role === "owner" || role === "caregiver";
  const [active, setActive] = useState<TabKey>("visits");
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState<HealthRow | null>(null);
  const [petFilter, setPetFilter] = useState("all");
  const pets = roster.filter((r) => r.kind === "pet");

  const rowsByTab: Record<HealthTabKey, HealthRow[]> = { illnesses, vaccinations };
  const tab = TABS.find((t) => t.key === active)!;

  function changeTab(key: TabKey) {
    setActive(key);
    setShowForm(false);
    setEditingRow(null);
  }

  if (active === "visits") {
    return (
      <div className="flex flex-col gap-6">
        <Header />
        <TabRow active={active} onChange={changeTab} />
        <VisitsPanel
          tenantId={tenantId}
          canWrite={canWrite}
          roster={roster}
          providers={visitProviders}
          serviceTypes={serviceTypes}
          dueVaccinationNames={dueVaccinationNames}
          visits={visits}
        />
      </div>
    );
  }

  if (active === "medications") {
    return (
      <div className="flex flex-col gap-6">
        <Header />
        <TabRow active={active} onChange={changeTab} />
        <MedicationsPanel tenantId={tenantId} canWrite={canWrite} roster={roster} vetProviders={vetProviders} medications={medications} />
      </div>
    );
  }

  if (active === "growth") {
    return (
      <div className="flex flex-col gap-6">
        <Header />
        <TabRow active={active} onChange={changeTab} />
        <GrowthPanel history={weightHistory} />
      </div>
    );
  }

  const allRows = rowsByTab[active];
  const rows = petFilter === "all" ? allRows : allRows.filter((r) => r.petId === petFilter);

  return (
    <div className="flex flex-col gap-6">
      <Header roster={canWrite ? pets : undefined} tab={tab} showForm={showForm} setShowForm={(v) => { setShowForm(v); setEditingRow(null); }} />
      <TabRow active={active} onChange={changeTab} />
      <PetFilterSelect roster={roster} value={petFilter} onChange={setPetFilter} />

      {(showForm || editingRow) && (
        <LogHealthForm
          tab={active}
          tenantId={tenantId}
          roster={roster}
          editing={editingRow ?? undefined}
          onDone={() => {
            setShowForm(false);
            setEditingRow(null);
          }}
        />
      )}

      {pets.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          Add a pet first — health records are logged per pet.
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">Nothing logged here yet.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface-2">
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">
                  Date
                </th>
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">
                  Who
                </th>
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">
                  Reason
                </th>
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">
                  Status
                </th>
                {canWrite && (
                  <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line" />
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-none">
                  <td className="px-4 py-3 text-muted">{r.date}</td>
                  <td className="px-4 py-3 font-medium">{r.who}</td>
                  <td className="px-4 py-3">{r.reason}</td>
                  <td className="px-4 py-3 font-mono">
                    {r.status}
                    {r.cost && <span className="text-muted"> · {r.cost}</span>}
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {active === "vaccinations" && r.status !== "Complete" && (
                          <MarkGivenButton tenantId={tenantId} vaccinationId={r.id} />
                        )}
                        <RowActions tenantId={tenantId} tab={active} rowId={r.id} onEdit={() => setEditingRow(r)} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function Header({
  roster,
  tab,
  showForm,
  setShowForm,
}: {
  roster?: RosterItem[];
  tab?: { logLabel: string };
  showForm?: boolean;
  setShowForm?: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl mb-1">Health</h1>
        <p className="text-sm text-muted">Workspace-wide · every pet</p>
      </div>
      {roster && roster.length > 0 && tab && tab.logLabel && setShowForm && (
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition"
        >
          <PlusIcon className="w-[.9em] h-[.9em]" />
          {tab.logLabel}
        </button>
      )}
    </div>
  );
}

function TabRow({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`text-sm px-4 py-2 rounded-lg transition ${
            active === t.key ? "bg-surface border border-line font-semibold text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
