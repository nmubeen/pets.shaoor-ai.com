"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { LogHealthForm, type HealthTabKey } from "@/components/health/LogHealthForm";
import { MedicationsPanel } from "@/components/health/MedicationsPanel";
import { markVaccinationGiven } from "@/lib/actions/health";
import type { HealthRow } from "@/lib/health";
import type { MedicationRow } from "@/lib/medications";
import type { RosterItem } from "@/lib/roster";
import type { Provider } from "@/lib/providers";

type TabKey = HealthTabKey | "medications";

const TABS: { key: TabKey; label: string; logLabel: string }[] = [
  { key: "visits", label: "Visits", logLabel: "Log a visit" },
  { key: "illnesses", label: "Illnesses", logLabel: "Log an illness" },
  { key: "vaccinations", label: "Vaccinations", logLabel: "Log a vaccination" },
  { key: "grooming", label: "Grooming", logLabel: "Log a grooming visit" },
  { key: "medications", label: "Medications", logLabel: "Add medication" },
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

export function HealthView({
  tenantId,
  roster,
  vetProviders,
  groomingProviders,
  visits,
  illnesses,
  vaccinations,
  grooming,
  medications,
}: {
  tenantId: string;
  roster: RosterItem[];
  vetProviders: Provider[];
  groomingProviders: Provider[];
  visits: HealthRow[];
  illnesses: HealthRow[];
  vaccinations: HealthRow[];
  grooming: HealthRow[];
  medications: MedicationRow[];
}) {
  const [active, setActive] = useState<TabKey>("visits");
  const [showForm, setShowForm] = useState(false);

  const rowsByTab: Record<HealthTabKey, HealthRow[]> = { visits, illnesses, vaccinations, grooming };
  const tab = TABS.find((t) => t.key === active)!;

  if (active === "medications") {
    return (
      <div className="flex flex-col gap-6">
        <Header />
        <TabRow active={active} onChange={setActive} />
        <MedicationsPanel tenantId={tenantId} roster={roster} vetProviders={vetProviders} medications={medications} />
      </div>
    );
  }

  const rows = rowsByTab[active];
  const lastCol = active === "visits" || active === "grooming" ? "Cost" : "Status";

  return (
    <div className="flex flex-col gap-6">
      <Header roster={roster} tab={tab} showForm={showForm} setShowForm={setShowForm} />
      <TabRow active={active} onChange={setActive} />

      {showForm && (
        <LogHealthForm
          tab={active}
          tenantId={tenantId}
          roster={roster}
          providers={active === "visits" ? vetProviders : active === "grooming" ? groomingProviders : []}
          onDone={() => setShowForm(false)}
        />
      )}

      {roster.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          Add a pet, group, or habitat first — health records are logged against your roster.
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
                  {lastCol}
                </th>
                {active === "vaccinations" && (
                  <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line" />
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-none">
                  <td className="px-4 py-3 text-muted">{r.date}</td>
                  <td className="px-4 py-3 font-medium">{r.who}</td>
                  <td className="px-4 py-3">
                    {r.reason}
                    {r.provider && <div className="text-xs text-muted mt-0.5">{r.provider}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono">{r.cost ?? r.status ?? "—"}</td>
                  {active === "vaccinations" && (
                    <td className="px-4 py-3">
                      {r.status !== "Complete" && <MarkGivenButton tenantId={tenantId} vaccinationId={r.id} />}
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
        <p className="text-sm text-muted">Workspace-wide · every pet, group, and habitat</p>
      </div>
      {roster && roster.length > 0 && tab && setShowForm && (
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
