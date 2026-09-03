"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { healthVisits, illnesses, vaccinations } from "@/lib/mock-data";

const tabs = [
  { key: "visits", label: "Visits", rows: healthVisits, statusKey: null as null },
  { key: "illnesses", label: "Illnesses", rows: illnesses, statusKey: "status" as const },
  { key: "vaccinations", label: "Vaccinations", rows: vaccinations, statusKey: "status" as const },
];

export default function HealthPage() {
  const [active, setActive] = useState("visits");
  const tab = tabs.find((t) => t.key === active)!;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Health</h1>
          <p className="text-sm text-muted">Household-wide · filter by pet</p>
        </div>
        <button className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition">
          <PlusIcon className="w-[.9em] h-[.9em]" />
          Log a visit
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
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
                {tab.statusKey ? "Status" : "Cost"}
              </th>
            </tr>
          </thead>
          <tbody>
            {tab.rows.map((r, i) => (
              <tr key={i} className="border-b border-line last:border-none">
                <td className="px-4 py-3 text-muted">{r.date}</td>
                <td className="px-4 py-3 font-medium">{r.who}</td>
                <td className="px-4 py-3">{r.reason}</td>
                <td className="px-4 py-3 font-mono">
                  {"cost" in r ? r.cost : (r as { status: string }).status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
