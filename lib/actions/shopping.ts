"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadImage, removeImage } from "@/lib/storage";

/**
 * Parses MultiScopePicker's "scope_ids" checkboxes ("pet:<id>" /
 * "habitat:<id>") into rows ready to insert into shopping_order_scopes.
 * An empty result is valid and means household-wide — same convention as
 * the old zero-or-one scope, just now zero-or-many.
 */
type ScopeRow = { pet_id: string | null; habitat_id: string | null };

function parseMultiScope(formData: FormData): ScopeRow[] {
  return formData
    .getAll("scope_ids")
    .filter((v): v is string => typeof v === "string")
    .map((raw): ScopeRow | null => {
      const [kind, id] = raw.split(":");
      if (kind === "pet" && id) return { pet_id: id, habitat_id: null };
      if (kind === "habitat" && id) return { pet_id: null, habitat_id: id };
      return null;
    })
    .filter((v): v is ScopeRow => v !== null);
}

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

  const { data: order, error } = await supabase
    .from("shopping_orders")
    .insert({
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
    })
    .select("id")
    .single();
  if (error || !order) return { error: error?.message ?? "Could not save that order." };

  const scopeRows = parseMultiScope(formData);
  if (scopeRows.length > 0) {
    const { error: scopeError } = await supabase
      .from("shopping_order_scopes")
      .insert(scopeRows.map((s) => ({ tenant_id: tenantId, order_id: order.id, ...s })));
    if (scopeError) return { error: scopeError.message };
  }

  revalidatePath("/app");
  revalidatePath("/app/shopping");
  return { error: null };
}
