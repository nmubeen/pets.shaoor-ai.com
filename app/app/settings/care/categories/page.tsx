import { requireActiveAccount } from "@/lib/tenant";
import { getShoppingCategories } from "@/lib/shopping-categories";
import { ShoppingCategoriesView } from "@/components/settings/ShoppingCategoriesView";

export default async function ShoppingCategoriesPage() {
  const { supabase, active } = await requireActiveAccount();
  const categories = await getShoppingCategories(supabase, active.tenantId);

  return <ShoppingCategoriesView tenantId={active.tenantId} categories={categories} />;
}
