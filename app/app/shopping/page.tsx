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

  return (
    <ShoppingView
      tenantId={active.tenantId}
      role={active.role}
      roster={roster}
      providers={providers}
      categories={categories}
      orders={orders}
      summary={summary}
    />
  );
}
