// The tenant-editable Shopping order category catalog (Settings → Care →
// Categories, alongside Service Types and Vaccinations —
// components/settings/ShoppingCategoriesView.tsx). Just a name, unlike
// care_service_types' frequency/species — a category is only ever a
// label to file an order under. shopping_orders.category itself stays a
// plain text column (0030_shopping_order_category.sql), not a foreign
// key here — same "type it, it's just a label" glue as an order's own
// item name, so renaming or deleting a category from this list never
// touches an order that already recorded one.
import "server-only";
import type { createClient } from "@/lib/supabase/server";

export type ShoppingCategory = {
  id: string;
  name: string;
};

export async function getShoppingCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<ShoppingCategory[]> {
  const { data } = await supabase
    .from("shopping_categories")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  return (data ?? []).map((c) => ({ id: c.id, name: c.name }));
}
