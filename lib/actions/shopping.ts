"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseScopeOptional } from "@/lib/scope";
import { uploadImage, removeImage } from "@/lib/storage";

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
async function findOrCreateProduct(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  name: string
): Promise<{ id: string; imagePath: string | null } | null> {
  const { data: existing } = await supabase
    .from("products")
    .select("id, image_path")
    .eq("tenant_id", tenantId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return { id: existing.id, imagePath: existing.image_path };

  const { data: created, error } = await supabase
    .from("products")
    .insert({ tenant_id: tenantId, name })
    .select("id, image_path")
    .single();
  if (error) return null;
  return { id: created.id, imagePath: created.image_path };
}

export async function addShoppingOrder(tenantId: string, formData: FormData) {
  const item = str(formData, "item");
  if (!item) return { error: "Item name is required." };

  const supabase = await createClient();
  const product = await findOrCreateProduct(supabase, tenantId, item);
  if (!product) return { error: "Could not save that item." };

  // An item photo belongs to the product (reused across every order of the
  // same item), not the individual order — see supabase/migrations/0009.
  const imageFile = formData.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    const { path, error: uploadError } = await uploadImage(supabase, tenantId, "products", imageFile);
    if (uploadError) return { error: uploadError };
    if (path) {
      await removeImage(supabase, product.imagePath);
      await supabase.from("products").update({ image_path: path }).eq("id", product.id);
    }
  }

  const { error } = await supabase.from("shopping_orders").insert({
    tenant_id: tenantId,
    product_id: product.id,
    provider_id: str(formData, "provider_id"),
    order_date: str(formData, "order_date") ?? new Date().toISOString().slice(0, 10),
    delivered_date: str(formData, "delivered_date"),
    item_url: str(formData, "item_url"),
    qty: num(formData, "qty"),
    qty_unit: str(formData, "qty_unit"),
    cost: num(formData, "cost"),
    notes: str(formData, "notes"),
    ...parseScopeOptional(str(formData, "scope")),
  });
  if (error) return { error: error.message };

  revalidatePath("/app");
  revalidatePath("/app/shopping");
  return { error: null };
}
