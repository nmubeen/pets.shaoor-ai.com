// A pure, client-safe counterpart to lib/shopping.ts's getSpendSummary —
// deliberately its own file, not a function added there, since that file
// carries "import server-only" and would poison the whole module for
// ShoppingView.tsx (a client component) the moment it imported a real
// (non type-only) binding from it. Used to recompute the summary cards
// against whatever scope/year/seller filter is currently active, so
// selecting a filter shows totals for *that* filtered set instead of
// always the same unfiltered, all-time numbers.
//
// Necessarily narrower than getSpendSummary: it only has shopping_orders
// to work with (ShoppingOrderRow), not visits — a filtered view can't
// meaningfully fold in health costs anyway, since Scope/Seller (a
// shopping_orders-only multi-scope/provider concept) don't describe a
// visit the same way. The unfiltered "shopping + health" figure from
// getSpendSummary is shown instead whenever no filter is active.
import type { ShoppingOrderRow } from "@/lib/shopping";

export type OrdersSummary = {
  spentLast30d: number;
  ordersLogged: number;
  avgOrder: number | null;
  totalSpent: number;
  totalOrdersCount: number;
  avgPerMonth: number | null;
};

/**
 * `nowIso` must be computed server-side and passed down as a prop (see
 * app/app/shopping/page.tsx) — calling Date.now()/`new Date()` directly
 * in this client component's render would risk the same hydration
 * mismatch fixed elsewhere in this app (lib/vet-view.ts's ageLabel,
 * app/app/layout.tsx's trialLabel).
 */
export function summarizeOrders(rows: ShoppingOrderRow[], nowIso: string): OrdersSummary {
  const now = new Date(`${nowIso}T00:00:00`);
  const since30dIso = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);

  const last30d = rows.filter((o) => o.orderedDateIso >= since30dIso);
  const spentLast30d = last30d.reduce((sum, o) => sum + (o.costValue ?? 0), 0);
  const ordersLogged = last30d.length;
  const avgOrder = ordersLogged > 0 ? spentLast30d / ordersLogged : null;

  const totalSpent = rows.reduce((sum, o) => sum + (o.costValue ?? 0), 0);
  const totalOrdersCount = rows.length;

  // Same "months from earliest to now, inclusive" idea as
  // getSpendSummary's own avgPerMonth, just scoped to the filtered set's
  // own earliest date rather than the tenant's all-time earliest.
  let avgPerMonth: number | null = null;
  if (rows.length > 0) {
    const earliestIso = rows.reduce((min, o) => (o.orderedDateIso < min ? o.orderedDateIso : min), rows[0].orderedDateIso);
    const earliestDate = new Date(`${earliestIso}T00:00:00`);
    const monthsSpanned =
      (now.getFullYear() - earliestDate.getFullYear()) * 12 + (now.getMonth() - earliestDate.getMonth()) + 1;
    avgPerMonth = totalSpent / Math.max(1, monthsSpanned);
  }

  return { spentLast30d, ordersLogged, avgOrder, totalSpent, totalOrdersCount, avgPerMonth };
}
