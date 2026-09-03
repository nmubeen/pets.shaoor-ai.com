"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { shoppingOrders } from "@/lib/mock-data";

const scopes = ["All", "Pet", "Group", "Household"];

export default function ShoppingPage() {
  const [scope, setScope] = useState("All");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Shopping</h1>
          <p className="text-sm text-muted">Orders and expenses, scoped to a pet, group, or the household</p>
        </div>
        <button className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition">
          <PlusIcon className="w-[.9em] h-[.9em]" />
          Log an order
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {scopes.map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`text-xs font-medium px-3.5 py-1.5 rounded-lg border transition ${
              scope === s
                ? "bg-primary text-primary-ink border-primary"
                : "text-muted border-line hover:text-ink"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">₹3,910</div>
          <div className="text-[.66rem] uppercase text-muted mt-1">Spent this month</div>
        </Card>
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">{shoppingOrders.length}</div>
          <div className="text-[.66rem] uppercase text-muted mt-1">Orders logged</div>
        </Card>
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">₹1,303</div>
          <div className="text-[.66rem] uppercase text-muted mt-1">Avg. order</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface-2">
              <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Date</th>
              <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Item</th>
              <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Scope</th>
              <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Cost</th>
            </tr>
          </thead>
          <tbody>
            {shoppingOrders.map((o, i) => (
              <tr key={i} className="border-b border-line last:border-none">
                <td className="px-4 py-3 text-muted">{o.date}</td>
                <td className="px-4 py-3 font-medium">{o.item}</td>
                <td className="px-4 py-3 text-muted">{o.scope}</td>
                <td className="px-4 py-3 font-mono">{o.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
