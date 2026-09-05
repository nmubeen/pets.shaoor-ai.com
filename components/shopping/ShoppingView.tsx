"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PlusIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { LogOrderForm } from "@/components/shopping/LogOrderForm";
import { deleteShoppingOrder } from "@/lib/actions/shopping";
import type { ShoppingOrderRow, SpendSummary } from "@/lib/shopping";
import { summarizeOrders } from "@/lib/shopping-summary";
import type { ShoppingCategory } from "@/lib/shopping-categories";
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

const PAGE_SIZE = 10;

const YEAR_ALL = "all";
const SELLER_ALL = "all";
/** Sentinel for "no seller set" — distinct from SELLER_ALL, and never a real provider id. */
const SELLER_NONE = "__none__";

const selectField =
  "bg-paper border border-line rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary transition";

const th = "text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line whitespace-nowrap";

function OrderActions({ tenantId, orderId, onEdit }: { tenantId: string; orderId: string; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <button onClick={onEdit} className="text-muted hover:text-ink border border-line rounded-md p-1.5 transition" aria-label="Edit order" title="Edit">
        <PencilIcon className="w-4 h-4" />
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
        className="text-muted hover:text-coral border border-line rounded-md p-1.5 transition disabled:opacity-60"
        aria-label="Delete order"
        title="Delete"
      >
        {pending ? "…" : <TrashIcon className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function ShoppingView({
  tenantId,
  role,
  roster,
  providers,
  categories,
  orders,
  summary,
  nowIso,
}: {
  tenantId: string;
  role: MembershipRole;
  roster: RosterItem[];
  providers: Provider[];
  categories: ShoppingCategory[];
  orders: ShoppingOrderRow[];
  summary: SpendSummary;
  /** Today, as a plain date string computed server-side — see lib/shopping-summary.ts's own doc comment for why. */
  nowIso: string;
}) {
  const canWrite = role === "owner" || role === "caregiver";
  const [scope, setScope] = useState<(typeof SCOPES)[number]["key"]>("all");
  const [year, setYear] = useState(YEAR_ALL);
  const [seller, setSeller] = useState(SELLER_ALL);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ShoppingOrderRow | null>(null);
  const [page, setPage] = useState(1);
  // Set right after adding a new order — highlights the row if it's
  // visible under whatever scope/year/seller/page was already active
  // (deliberately not forced to change: the filtered view you had before
  // opening "Log an order" is the one you should come back to). Does
  // nothing when the new order doesn't happen to match the current
  // filters/page — it was still added, just not shown right now.
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Newest first, same as orders are already sorted — the years drop
  // naturally out of the (already-sorted) order dates, no extra sort
  // needed for the years list itself since Set preserves insertion order.
  const years = [...new Set(orders.map((o) => o.orderedDateIso.slice(0, 4)))];
  const sellers = [...new Set(orders.map((o) => o.provider).filter((p): p is string => p !== null))].sort((a, b) =>
    a.localeCompare(b)
  );
  const hasUnsetSeller = orders.some((o) => o.provider === null);

  const filtered = orders
    .filter((o) =>
      scope === "all" ? true : scope === "household" ? o.scopeKinds.length === 0 : o.scopeKinds.includes(scope)
    )
    .filter((o) => year === YEAR_ALL || o.orderedDateIso.slice(0, 4) === year)
    .filter((o) => {
      if (seller === SELLER_ALL) return true;
      if (seller === SELLER_NONE) return o.provider === null;
      return o.provider === seller;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  // The summary cards show the server-computed, unfiltered "shopping +
  // health" rollup only while nothing's filtered; the moment a
  // scope/year/seller filter is active, they recompute from exactly the
  // orders that filter leaves in `filtered` (shopping only — a filtered
  // view can't meaningfully fold in health visit costs, since Scope and
  // Seller don't describe a visit the same way an order's multi-scope/
  // provider fields do).
  const hasActiveFilter = scope !== "all" || year !== YEAR_ALL || seller !== SELLER_ALL;
  const displaySummary = hasActiveFilter ? summarizeOrders(filtered, nowIso) : summary;

  function changeScope(next: (typeof SCOPES)[number]["key"]) {
    setScope(next);
    setPage(1);
  }

  function changeYear(next: string) {
    setYear(next);
    setPage(1);
  }

  function changeSeller(next: string) {
    setSeller(next);
    setPage(1);
  }

  // Scrolls to and fades the highlight, but only if the new order is
  // actually present on the current page under the current filters —
  // checked by querying the live DOM (does an element with this id
  // exist right now), not by inspecting `pageItems` directly. `pageItems`
  // is still a dependency, though: it's what changes once `orders`
  // refreshes with the new row in it, which is what should make this
  // effect re-check. If the row isn't on this page, this quietly does
  // nothing — the view stays exactly as it was, per the whole point of
  // not forcing the filters/page to change on save.
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`shopping-order-${highlightId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(timer);
  }, [pageItems, highlightId]);

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
            onClick={() => changeScope(s.key)}
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

      <div className="flex gap-2 flex-wrap items-center">
        <select value={year} onChange={(e) => changeYear(e.target.value)} className={selectField} aria-label="Filter by year">
          <option value={YEAR_ALL}>All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select value={seller} onChange={(e) => changeSeller(e.target.value)} className={selectField} aria-label="Filter by seller">
          <option value={SELLER_ALL}>All sellers</option>
          {sellers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          {hasUnsetSeller && <option value={SELLER_NONE}>No seller set</option>}
        </select>
      </div>

      {(showForm || editingOrder) && (
        <LogOrderForm
          tenantId={tenantId}
          roster={roster}
          providers={providers}
          categories={categories}
          editing={editingOrder ?? undefined}
          onDone={(createdId) => {
            setShowForm(false);
            setEditingOrder(null);
            // Filters/page are left exactly as they were — see
            // highlightId's own comment above for why.
            if (createdId) setHighlightId(createdId);
          }}
        />
      )}

      {hasActiveFilter && (
        <p className="text-xs text-muted -mb-2">Summary below reflects the filters selected above.</p>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">{formatCurrency(displaySummary.spentLast30d)}</div>
          <div className="text-[.66rem] uppercase text-muted mt-1">
            Spent · 30d {hasActiveFilter ? "(filtered)" : "(shopping + health)"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">{displaySummary.ordersLogged}</div>
          <div className="text-[.66rem] uppercase text-muted mt-1">Orders logged · 30d</div>
        </Card>
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">
            {displaySummary.avgOrder !== null ? formatCurrency(displaySummary.avgOrder) : "—"}
          </div>
          <div className="text-[.66rem] uppercase text-muted mt-1">Avg. order · 30d</div>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">{formatCurrency(displaySummary.totalSpent)}</div>
          <div className="text-[.66rem] uppercase text-muted mt-1">
            Total spent {hasActiveFilter ? "(filtered)" : "(shopping + health)"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">{displaySummary.totalOrdersCount}</div>
          <div className="text-[.66rem] uppercase text-muted mt-1">Total orders</div>
        </Card>
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">
            {displaySummary.avgPerMonth !== null ? formatCurrency(displaySummary.avgPerMonth) : "—"}
          </div>
          <div className="text-[.66rem] uppercase text-muted mt-1">Avg. order amount / month</div>
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
                <th className={th}>Category</th>
                <th className={th}>Scope</th>
                <th className={th}>Seller</th>
                <th className={th}>Ordered</th>
                <th className={th}>Cost</th>
                {canWrite && <th className={th}></th>}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((o) => (
                <tr
                  key={o.id}
                  id={`shopping-order-${o.id}`}
                  className={`border-b border-line last:border-none transition-colors duration-500 ${
                    o.id === highlightId ? "bg-accent/15" : ""
                  }`}
                >
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
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{o.category ?? "—"}</td>
                  <td className="px-4 py-3 text-muted max-w-[200px]">{o.scope}</td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{o.provider ?? "—"}</td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{o.orderedDate}</td>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted">
            Page {pageSafe} of {totalPages} · {filtered.length} order{filtered.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe === 1}
              className="text-xs text-muted hover:text-ink border border-line rounded-md px-3 py-1.5 transition disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe === totalPages}
              className="text-xs text-muted hover:text-ink border border-line rounded-md px-3 py-1.5 transition disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
