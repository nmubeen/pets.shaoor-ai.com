import { ShoppingView } from "@/components/shopping/ShoppingView";
import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getShoppingOrders, getSpendSummary } from "@/lib/shopping";

export default async function ShoppingPage() {
  const { supabase, active } = await requireActiveMembership();

  const [roster, orders, summary] = await Promise.all([
    getRoster(supabase, active.tenantId),
    getShoppingOrders(supabase, active.tenantId),
    getSpendSummary(supabase, active.tenantId),
  ]);

  return <ShoppingView tenantId={active.tenantId} roster={roster} orders={orders} summary={summary} />;
}
