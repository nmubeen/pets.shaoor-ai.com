"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { LogOrderForm } from "@/components/shopping/LogOrderForm";
import type { ShoppingOrderRow, SpendSummary } from "@/lib/shopping";
import type { RosterItem } from "@/lib/roster";

const SCOPES = [
  { key: "all", label: "All" },
  { key: "pet", label: "Pet" },
  { key: "group", label: "Group" },
  { key: "habitat", label: "Habitat" },
  { key: "household", label: "Household" },
] as const;

function fmtInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function ShoppingView({
  tenantId,
  roster,
  orders,
  summary,
}: {
  tenantId: string;
  roster: RosterItem[];
  orders: ShoppingOrderRow[];
  summary: SpendSummary;
}) {
  const [scope, setScope] = useState<(typeof SCOPES)[number]["key"]>("all");
  const [showForm, setShowForm] = useState(false);

  const filtered = scope === "all" ? orders : orders.filter((o) => o.scopeKind === scope);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Shopping</h1>
          <p className="text-sm text-muted">Orders and expenses, scoped to a pet, group, habitat, or the household</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition"
        >
          <PlusIcon className="w-[.9em] h-[.9em]" />
          Log an order
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            onClick={() => setScope(s.key)}
            className={`text-xs font-medium px-3.5 py-1.5 rounded-lg border transition ${
              scope === s.key
                ? "bg-primary text-primary-ink border-primary"
                : "text-muted border-line hover:text-ink"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {showForm && <LogOrderForm tenantId={tenantId} roster={roster} onDone={() => setShowForm(false)} />}

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">{fmtInr(summary.spentLast30d)}</div>
          <div className="text-[.66rem] uppercase text-muted mt-1">Spent · 30d (shopping + health)</div>
        </Card>
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">{summary.ordersLogged}</div>
          <div className="text-[.66rem] uppercase text-muted mt-1">Orders logged · 30d</div>
        </Card>
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">
            {summary.avgOrder !== null ? fmtInr(summary.avgOrder) : "—"}
          </div>
          <div className="text-[.66rem] uppercase text-muted mt-1">Avg. order · 30d</div>
        </Card>
      </div>

      {filtered.length === 0 ? (
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
                  Item
                </th>
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">
                  Scope
                </th>
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-none">
                  <td className="px-4 py-3 text-muted">{o.date}</td>
                  <td className="px-4 py-3 font-medium">{o.item}</td>
                  <td className="px-4 py-3 text-muted">{o.scope}</td>
                  <td className="px-4 py-3 font-mono">{o.cost ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
