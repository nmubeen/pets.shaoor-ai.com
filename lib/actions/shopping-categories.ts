"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function revalidate() {
  revalidatePath("/app/settings/care");
  revalidatePath("/app/shopping");
}

export async function addShoppingCategory(tenantId: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("shopping_categories").insert({ tenant_id: tenantId, name });
  if (error) {
    if (error.code === "23505") return { error: "A category with that name already exists." };
    return { error: error.message };
  }

  revalidate();
  return { error: null };
}

export async function updateShoppingCategory(tenantId: string, categoryId: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_categories")
    .update({ name })
    .eq("id", categoryId)
    .eq("tenant_id", tenantId);
  if (error) {
    if (error.code === "23505") return { error: "A category with that name already exists." };
    return { error: error.message };
  }

  revalidate();
  return { error: null };
}

/** Deleting a category only removes it from the picker — past orders keep the category name they already recorded (shopping_orders.category is a plain text snapshot, not a foreign key). */
export async function deleteShoppingCategory(tenantId: string, categoryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_categories").delete().eq("id", categoryId).eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidate();
  return { error: null };
}
