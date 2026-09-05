"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { LogOrderForm } from "@/components/shopping/LogOrderForm";
import { deleteShoppingOrder } from "@/lib/actions/shopping";
import type { ShoppingOrderRow, SpendSummary } from "@/lib/shopping";
import type { RosterItem } from "@/lib/roster";
import type { Provider } from "@/lib/providers";
import type { MembershipRole } from "@/lib/database.types";
import { formatCurrency } from "@/lib/format";

const SCOPES = [
  { key: "all", label: "All" },
  { key: "pet", label: "Pet" },
  { key: "habitat", label: "Habitat" },
  { key: "household", label: "Household" },
] as const;

const th = "text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line whitespace-nowrap";

function OrderActions({ tenantId, orderId, onEdit }: { tenantId: string; orderId: string; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <button onClick={onEdit} className="text-xs text-muted hover:text-ink border border-line rounded-md px-2 py-1 transition">
        Edit
      </button>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (!confirm("Delete this order?")) return;
            await deleteShoppingOrder(tenantId, orderId);
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

export function ShoppingView({
  tenantId,
  role,
  roster,
  providers,
  orders,
  summary,
}: {
  tenantId: string;
  role: MembershipRole;
  roster: RosterItem[];
  providers: Provider[];
  orders: ShoppingOrderRow[];
  summary: SpendSummary;
}) {
  const canWrite = role === "owner" || role === "caregiver";
  const [scope, setScope] = useState<(typeof SCOPES)[number]["key"]>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ShoppingOrderRow | null>(null);

  const filtered =
    scope === "all"
      ? orders
      : scope === "household"
        ? orders.filter((o) => o.scopeKinds.length === 0)
        : orders.filter((o) => o.scopeKinds.includes(scope));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Shopping</h1>
          <p className="text-sm text-muted">Orders and expenses — scope to any combination of pets and habitats, or the whole household</p>
        </div>
        {canWrite && (
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setEditingOrder(null);
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition"
          >
            <PlusIcon className="w-[.9em] h-[.9em]" />
            Log an order
          </button>
        )}
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

      {(showForm || editingOrder) && (
        <LogOrderForm
          tenantId={tenantId}
          roster={roster}
          providers={providers}
          editing={editingOrder ?? undefined}
          onDone={() => {
            setShowForm(false);
            setEditingOrder(null);
          }}
        />
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">{formatCurrency(summary.spentLast30d)}</div>
          <div className="text-[.66rem] uppercase text-muted mt-1">Spent · 30d (shopping + health)</div>
        </Card>
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">{summary.ordersLogged}</div>
          <div className="text-[.66rem] uppercase text-muted mt-1">Orders logged · 30d</div>
        </Card>
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">
            {summary.avgOrder !== null ? formatCurrency(summary.avgOrder) : "—"}
          </div>
          <div className="text-[.66rem] uppercase text-muted mt-1">Avg. order · 30d</div>
        </Card>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">Nothing logged here yet.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface-2">
                <th className={th}>Item</th>
                <th className={th}>Scope</th>
                <th className={th}>Bought from</th>
                <th className={th}>Ordered</th>
                <th className={th}>Delivered</th>
                <th className={th}>Cost</th>
                {canWrite && <th className={th}></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-none">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {o.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={o.imageUrl}
                          alt={o.item}
                          className="w-8 h-8 rounded-md object-cover border border-line flex-none"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {o.itemUrl ? (
                            <a href={o.itemUrl} target="_blank" rel="noreferrer" className="hover:underline">
                              {o.item}
                            </a>
                          ) : (
                            o.item
                          )}
                        </div>
                        {o.qtyLabel && <div className="text-xs text-muted">{o.qtyLabel}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted max-w-[200px]">{o.scope}</td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{o.provider ?? "—"}</td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{o.orderedDate}</td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{o.deliveredDate ?? "—"}</td>
                  <td className="px-4 py-3 font-mono whitespace-nowrap">{o.cost ?? "—"}</td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <OrderActions
                        tenantId={tenantId}
                        orderId={o.id}
                        onEdit={() => {
                          setEditingOrder(o);
                          setShowForm(false);
                        }}
                      />
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
