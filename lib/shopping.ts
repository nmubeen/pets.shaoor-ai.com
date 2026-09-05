// Fetches and formats shopping orders for /app/shopping, plus a combined
// spend rollup ("expense reporting", §05 roadmap phrase) across every
// cost-bearing table — shopping_orders, visits — rather than a separate
// expenses ledger. See supabase/migrations/0005.
//
// Scope went many-to-many in 0017_scope_rework.sql (shopping_order_scopes)
// — an order can name any combination of pets/habitats, not just one, so
// "who" is a list here instead of a single lookup.
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getRoster } from "@/lib/roster";
import { getProviders } from "@/lib/providers";
import { formatCurrency, formatDate } from "@/lib/format";

export type ShoppingOrderRow = {
  id: string;
  orderedDate: string;
  orderedDateIso: string;
  deliveredDate: string | null;
  deliveredDateIso: string | null;
  item: string;
  itemUrl: string | null;
  imageUrl: string | null;
  qtyLabel: string | null;
  qty: number | null;
  qtyUnit: string | null;
  scope: string;
  scopeIds: string[];
  /** Which kinds of target this order includes — empty means household-wide. */
  scopeKinds: ("pet" | "habitat")[];
  provider: string | null;
  providerId: string | null;
  cost: string | null;
  costValue: number | null;
  notes: string | null;
  category: string | null;
};

const SIGNED_URL_TTL_SECONDS = 60 * 60;

function fmtDate(iso: string): string {
  return formatDate(new Date(iso + "T00:00:00"));
}

function fmtQty(qty: number | null, unit: string | null): string | null {
  if (qty === null) return null;
  return unit ? `${qty} ${unit}` : String(qty);
}

export async function getShoppingOrders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<ShoppingOrderRow[]> {
  const [{ data }, { data: scopeRows }, roster, providers] = await Promise.all([
    supabase
      .from("shopping_orders")
      .select("id, provider_id, order_date, delivered_date, item_url, qty, qty_unit, cost, notes, category, products(name, image_path)")
      .eq("tenant_id", tenantId)
      .order("order_date", { ascending: false }),
    supabase.from("shopping_order_scopes").select("order_id, pet_id, habitat_id").eq("tenant_id", tenantId),
    getRoster(supabase, tenantId),
    getProviders(supabase, tenantId, ["offline_shop", "online_shop"]),
  ]);

  const byId = new Map(roster.map((r) => [r.id, r]));
  const providerById = new Map(providers.map((p) => [p.id, p.name]));
  const items = data ?? [];

  const scopesByOrder = new Map<string, { id: string; kind: "pet" | "habitat" }[]>();
  for (const row of scopeRows ?? []) {
    const scopeId = row.pet_id ?? row.habitat_id;
    if (!scopeId) continue;
    const kind = row.pet_id ? ("pet" as const) : ("habitat" as const);
    const list = scopesByOrder.get(row.order_id) ?? [];
    list.push({ id: scopeId, kind });
    scopesByOrder.set(row.order_id, list);
  }

  const imagePaths = items
    .map((o) => (o.products as unknown as { image_path: string | null } | null)?.image_path)
    .filter((p): p is string => !!p);
  const { data: signed } = imagePaths.length
    ? await supabase.storage.from("media").createSignedUrls(imagePaths, SIGNED_URL_TTL_SECONDS)
    : { data: [] as { path: string | null; signedUrl: string | null }[] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return items.map((o) => {
    const scopes = scopesByOrder.get(o.id) ?? [];
    const names = scopes.map((s) => byId.get(s.id)?.name ?? "Unknown");
    const product = o.products as unknown as { name: string; image_path: string | null } | null;
    return {
      id: o.id,
      orderedDate: fmtDate(o.order_date),
      orderedDateIso: o.order_date,
      deliveredDate: o.delivered_date ? fmtDate(o.delivered_date) : null,
      deliveredDateIso: o.delivered_date,
      item: product?.name ?? "Unknown item",
      itemUrl: o.item_url,
      imageUrl: product?.image_path ? (urlByPath.get(product.image_path) ?? null) : null,
      qtyLabel: fmtQty(o.qty, o.qty_unit),
      qty: o.qty,
      qtyUnit: o.qty_unit,
      scope: names.length > 0 ? names.join(", ") : "Household",
      scopeIds: scopes.map((s) => s.id),
      scopeKinds: [...new Set(scopes.map((s) => s.kind))],
      provider: o.provider_id ? (providerById.get(o.provider_id) ?? null) : null,
      providerId: o.provider_id,
      cost: formatCurrency(o.cost),
      costValue: o.cost,
      notes: o.notes,
      category: o.category,
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

  const [orders, visits] = await Promise.all([
    supabase.from("shopping_orders").select("cost, order_date").eq("tenant_id", tenantId).gte("order_date", since),
    supabase.from("visits").select("cost, visit_date").eq("tenant_id", tenantId).gte("visit_date", since),
  ]);

  const orderCosts = (orders.data ?? []).map((r) => r.cost ?? 0);
  const otherCosts = (visits.data ?? []).map((r) => r.cost ?? 0);
  const spentLast30d = [...orderCosts, ...otherCosts].reduce((sum, c) => sum + c, 0);
  const ordersLogged = orders.data?.length ?? 0;
  const avgOrder = ordersLogged > 0 ? orderCosts.reduce((s, c) => s + c, 0) / ordersLogged : null;

  return { spentLast30d, ordersLogged, avgOrder };
}
