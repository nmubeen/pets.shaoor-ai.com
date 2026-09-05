"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PlusIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { LogOrderForm } from "@/components/shopping/LogOrderForm";
import { deleteShoppingOrder } from "@/lib/actions/shopping";
import type { ShoppingOrderRow, SpendSummary } from "@/lib/shopping";
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
}: {
  tenantId: string;
  role: MembershipRole;
  roster: RosterItem[];
  providers: Provider[];
  categories: ShoppingCategory[];
  orders: ShoppingOrderRow[];
  summary: SpendSummary;
}) {
  const canWrite = role === "owner" || role === "caregiver";
  const [scope, setScope] = useState<(typeof SCOPES)[number]["key"]>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ShoppingOrderRow | null>(null);
  const [page, setPage] = useState(1);
  // Set right after adding a new order — jumps the list to whichever page
  // holds it and briefly highlights the row, so "Save" doesn't just leave
  // you wondering where it landed.
  const [highlightId, setHighlightId] = useState<string | null>(null);
  // Which highlightId `page` has already been jumped for — without this,
  // re-computing the jump on every render would fight the Previous/Next
  // buttons the moment someone clicks away while still highlighted. Plain
  // state, not a ref: React's own "adjusting state when a prop changes"
  // pattern (see the useState docs) calls for state here specifically —
  // this project's lint rules forbid touching a ref's `.current` during
  // render at all, even for this exact purpose.
  const [jumpedForId, setJumpedForId] = useState<string | null>(null);

  const filtered =
    scope === "all"
      ? orders
      : scope === "household"
        ? orders.filter((o) => o.scopeKinds.length === 0)
        : orders.filter((o) => o.scopeKinds.includes(scope));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  function changeScope(next: (typeof SCOPES)[number]["key"]) {
    setScope(next);
    setPage(1);
  }

  // Once the freshly-added order shows up in `filtered` (after the form's
  // own router.refresh() completes — `filtered`, not `orders`, so this
  // also re-checks when `scope` flips to "all" in onDone below, in case
  // the new order's own scope wasn't visible under whatever tab was
  // active when it was added), jump to whichever page contains it. Done
  // inline during render — an official React-supported way to adjust
  // state in response to a prop/derived-value change — rather than in an
  // effect, since a *conditional* setState call in an effect body is
  // exactly the "cascading render" pattern the lint rule (rightly) flags.
  if (highlightId && jumpedForId !== highlightId) {
    const idx = filtered.findIndex((o) => o.id === highlightId);
    if (idx !== -1) {
      setJumpedForId(highlightId);
      setPage(Math.floor(idx / PAGE_SIZE) + 1);
    }
  }

  // Scrolls to and fades the highlight once the row actually exists in
  // the DOM — i.e. once `page` has settled on the one computed above.
  // Queried live rather than via a ref map, since which page (and thus
  // whether this row is even mounted) can change between renders.
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`shopping-order-${highlightId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(timer);
    // `page`, not `pageItems` — the latter is a fresh array every render,
    // which would restart this effect (and its 2.5s timer) on any
    // unrelated re-render while highlighted.
  }, [page, highlightId]);

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
            if (createdId) {
              // "all" guarantees the new order is visible regardless of
              // which scope it belongs to.
              setScope("all");
              setHighlightId(createdId);
            }
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

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">{formatCurrency(summary.totalSpent)}</div>
          <div className="text-[.66rem] uppercase text-muted mt-1">Total spent (shopping + health)</div>
        </Card>
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">{summary.totalOrdersCount}</div>
          <div className="text-[.66rem] uppercase text-muted mt-1">Total orders</div>
        </Card>
        <Card className="p-4">
          <div className="font-mono font-semibold text-xl">
            {summary.avgPerMonth !== null ? formatCurrency(summary.avgPerMonth) : "—"}
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
                <th className={th}>Bought from</th>
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
                        {o.qtyLabel && <div className="text-xs text-muted">{o.qtyLabel}</div>}
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
