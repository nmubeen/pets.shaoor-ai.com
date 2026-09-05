import { ShoppingView } from "@/components/shopping/ShoppingView";
import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getShoppingOrders, getSpendSummary } from "@/lib/shopping";
import { getShoppingCategories } from "@/lib/shopping-categories";
import { getProviders } from "@/lib/providers";

export default async function ShoppingPage() {
  const { supabase, active } = await requireActiveMembership();

  const [roster, orders, summary, providers, categories] = await Promise.all([
    getRoster(supabase, active.tenantId),
    getShoppingOrders(supabase, active.tenantId),
    getSpendSummary(supabase, active.tenantId),
    getProviders(supabase, active.tenantId, ["offline_shop", "online_shop"]),
    getShoppingCategories(supabase, active.tenantId),
  ]);

  // Computed here, server-side, and passed down as a plain string — the
  // filtered summary cards below need "today" to work out a filtered
  // set's own month-span (see ShoppingView.tsx), and calling Date.now()
  // directly in that client component's render would risk a hydration
  // mismatch (same fix as elsewhere in this app — lib/vet-view.ts's
  // ageLabel, app/app/layout.tsx's trialLabel).
  const nowIso = new Date().toISOString().slice(0, 10);

  return (
    <ShoppingView
      tenantId={active.tenantId}
      role={active.role}
      roster={roster}
      providers={providers}
      categories={categories}
      orders={orders}
      summary={summary}
      nowIso={nowIso}
    />
  );
}
