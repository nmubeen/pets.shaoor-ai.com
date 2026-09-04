"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseScopeOptional } from "@/lib/scope";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function num(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Finds a product by name for this tenant, creating it if it doesn't exist yet. */
async function findOrCreateProductId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  name: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("products")
    .insert({ tenant_id: tenantId, name })
    .select("id")
    .single();
  if (error) return null;
  return created.id;
}

export async function addShoppingOrder(tenantId: string, formData: FormData) {
  const item = str(formData, "item");
  if (!item) return { error: "Item name is required." };

  const supabase = await createClient();
  const productId = await findOrCreateProductId(supabase, tenantId, item);
  if (!productId) return { error: "Could not save that item." };

  const { error } = await supabase.from("shopping_orders").insert({
    tenant_id: tenantId,
    product_id: productId,
    order_date: str(formData, "order_date") ?? new Date().toISOString().slice(0, 10),
    cost: num(formData, "cost"),
    notes: str(formData, "notes"),
    ...parseScopeOptional(str(formData, "scope")),
  });
  if (error) return { error: error.message };

  revalidatePath("/app");
  revalidatePath("/app/shopping");
  return { error: null };
}
