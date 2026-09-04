// Fetches and formats shopping orders for /app/shopping, plus a combined
// spend rollup ("expense reporting", §05 roadmap phrase) across every
// cost-bearing table — shopping_orders, vet_visits, grooming_visits —
// rather than a separate expenses ledger. See supabase/migrations/0005.
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getRoster } from "@/lib/roster";
import { pickScopeId } from "@/lib/scope";

export type ShoppingOrderRow = {
  id: string;
  date: string;
  dateIso: string;
  item: string;
  scope: string;
  scopeKind: "pet" | "group" | "habitat" | "household";
  cost: string | null;
  costValue: number | null;
};

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function fmtCost(value: number | null): string | null {
  if (value === null) return null;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export async function getShoppingOrders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<ShoppingOrderRow[]> {
  const [{ data }, roster] = await Promise.all([
    supabase
      .from("shopping_orders")
      .select("id, pet_id, group_id, habitat_id, order_date, cost, products(name)")
      .eq("tenant_id", tenantId)
      .order("order_date", { ascending: false }),
    getRoster(supabase, tenantId),
  ]);

  const byId = new Map(roster.map((r) => [r.id, r]));

  return (data ?? []).map((o) => {
    const scopeId = pickScopeId(o);
    const rosterItem = scopeId ? byId.get(scopeId) : null;
    const product = o.products as unknown as { name: string } | null;
    return {
      id: o.id,
      date: fmtDate(o.order_date),
      dateIso: o.order_date,
      item: product?.name ?? "Unknown item",
      scope: rosterItem?.name ?? (scopeId ? "Unknown" : "Household"),
      scopeKind: rosterItem?.kind ?? "household",
      cost: fmtCost(o.cost),
      costValue: o.cost,
    };
  });
}

export type SpendSummary = {
  spentLast30d: number;
  ordersLogged: number;
  avgOrder: number | null;
};

export async function getSpendSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<SpendSummary> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  const [orders, visits, grooming] = await Promise.all([
    supabase.from("shopping_orders").select("cost, order_date").eq("tenant_id", tenantId).gte("order_date", since),
    supabase.from("vet_visits").select("cost, visit_date").eq("tenant_id", tenantId).gte("visit_date", since),
    supabase
      .from("grooming_visits")
      .select("cost, visit_date")
      .eq("tenant_id", tenantId)
      .gte("visit_date", since),
  ]);

  const orderCosts = (orders.data ?? []).map((r) => r.cost ?? 0);
  const otherCosts = [...(visits.data ?? []), ...(grooming.data ?? [])].map((r) => r.cost ?? 0);
  const spentLast30d = [...orderCosts, ...otherCosts].reduce((sum, c) => sum + c, 0);
  const ordersLogged = orders.data?.length ?? 0;
  const avgOrder = ordersLogged > 0 ? orderCosts.reduce((s, c) => s + c, 0) / ordersLogged : null;

  return { spentLast30d, ordersLogged, avgOrder };
}
