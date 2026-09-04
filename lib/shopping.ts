// Fetches and formats shopping orders for /app/shopping, plus a combined
// spend rollup ("expense reporting", §05 roadmap phrase) across every
// cost-bearing table — shopping_orders, vet_visits, grooming_visits —
// rather than a separate expenses ledger. See supabase/migrations/0005.
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getRoster } from "@/lib/roster";
import { pickScopeId } from "@/lib/scope";
import { getProviders } from "@/lib/providers";
import { formatCurrency } from "@/lib/format";

export type ShoppingOrderRow = {
  id: string;
  orderedDate: string;
  orderedDateIso: string;
  deliveredDate: string | null;
  item: string;
  itemUrl: string | null;
  imageUrl: string | null;
  qtyLabel: string | null;
  scope: string;
  scopeKind: "pet" | "habitat" | "household";
  provider: string | null;
  cost: string | null;
  costValue: number | null;
};

const SIGNED_URL_TTL_SECONDS = 60 * 60;

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function fmtQty(qty: number | null, unit: string | null): string | null {
  if (qty === null) return null;
  return unit ? `${qty} ${unit}` : String(qty);
}

export async function getShoppingOrders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<ShoppingOrderRow[]> {
  const [{ data }, roster, providers] = await Promise.all([
    supabase
      .from("shopping_orders")
      .select(
        "id, pet_id, habitat_id, provider_id, order_date, delivered_date, item_url, qty, qty_unit, cost, products(name, image_path)"
      )
      .eq("tenant_id", tenantId)
      .order("order_date", { ascending: false }),
    getRoster(supabase, tenantId),
    getProviders(supabase, tenantId, ["offline_shop", "online_shop"]),
  ]);

  const byId = new Map(roster.map((r) => [r.id, r]));
  const providerById = new Map(providers.map((p) => [p.id, p.name]));
  const items = data ?? [];

  const imagePaths = items
    .map((o) => (o.products as unknown as { image_path: string | null } | null)?.image_path)
    .filter((p): p is string => !!p);
  const { data: signed } = imagePaths.length
    ? await supabase.storage.from("media").createSignedUrls(imagePaths, SIGNED_URL_TTL_SECONDS)
    : { data: [] as { path: string | null; signedUrl: string | null }[] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return items.map((o) => {
    const scopeId = pickScopeId(o);
    const rosterItem = scopeId ? byId.get(scopeId) : null;
    const product = o.products as unknown as { name: string; image_path: string | null } | null;
    return {
      id: o.id,
      orderedDate: fmtDate(o.order_date),
      orderedDateIso: o.order_date,
      deliveredDate: o.delivered_date ? fmtDate(o.delivered_date) : null,
      item: product?.name ?? "Unknown item",
      itemUrl: o.item_url,
      imageUrl: product?.image_path ? (urlByPath.get(product.image_path) ?? null) : null,
      qtyLabel: fmtQty(o.qty, o.qty_unit),
      scope: rosterItem?.name ?? (scopeId ? "Unknown" : "Household"),
      scopeKind: rosterItem?.kind ?? "household",
      provider: o.provider_id ? (providerById.get(o.provider_id) ?? null) : null,
      cost: formatCurrency(o.cost),
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
