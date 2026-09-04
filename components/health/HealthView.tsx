"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { LogHealthForm, type HealthTabKey } from "@/components/health/LogHealthForm";
import type { HealthRow } from "@/lib/health";
import type { RosterItem } from "@/lib/roster";
import type { Provider } from "@/lib/providers";

const TABS: { key: HealthTabKey; label: string; logLabel: string }[] = [
  { key: "visits", label: "Visits", logLabel: "Log a visit" },
  { key: "illnesses", label: "Illnesses", logLabel: "Log an illness" },
  { key: "vaccinations", label: "Vaccinations", logLabel: "Log a vaccination" },
  { key: "grooming", label: "Grooming", logLabel: "Log a grooming visit" },
];

export function HealthView({
  tenantId,
  roster,
  vetProviders,
  groomingProviders,
  visits,
  illnesses,
  vaccinations,
  grooming,
}: {
  tenantId: string;
  roster: RosterItem[];
  vetProviders: Provider[];
  groomingProviders: Provider[];
  visits: HealthRow[];
  illnesses: HealthRow[];
  vaccinations: HealthRow[];
  grooming: HealthRow[];
}) {
  const [active, setActive] = useState<HealthTabKey>("visits");
  const [showForm, setShowForm] = useState(false);

  const rowsByTab: Record<HealthTabKey, HealthRow[]> = { visits, illnesses, vaccinations, grooming };
  const rows = rowsByTab[active];
  const tab = TABS.find((t) => t.key === active)!;
  const lastCol = active === "visits" || active === "grooming" ? "Cost" : "Status";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Health</h1>
          <p className="text-sm text-muted">Workspace-wide · every pet, group, and habitat</p>
        </div>
        {roster.length > 0 && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition"
          >
            <PlusIcon className="w-[.9em] h-[.9em]" />
            {tab.logLabel}
          </button>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActive(t.key);
              setShowForm(false);
            }}
            className={`text-sm px-4 py-2 rounded-lg transition ${
              active === t.key
                ? "bg-surface border border-line font-semibold text-ink"
                : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

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
        <Card className="overflow-hidden">
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
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
