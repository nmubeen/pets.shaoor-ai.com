"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ServiceProviderCategory } from "@/lib/database.types";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function revalidateProviders() {
  revalidatePath("/app/providers");
  revalidatePath("/app/health");
  revalidatePath("/app/shopping");
}

export async function addProvider(tenantId: string, category: ServiceProviderCategory, formData: FormData) {
  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("service_providers").insert({
    tenant_id: tenantId,
    category,
    name,
    phone: str(formData, "phone"),
    address: str(formData, "address"),
    website: str(formData, "website"),
    notes: str(formData, "notes"),
  });
  if (error) {
    if (error.code === "23505") return { error: "A provider with that name already exists in this category." };
    return { error: error.message };
  }

  revalidateProviders();
  return { error: null };
}

export async function updateProvider(tenantId: string, providerId: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("service_providers")
    .update({
      name,
      phone: str(formData, "phone"),
      address: str(formData, "address"),
      website: str(formData, "website"),
      notes: str(formData, "notes"),
    })
    .eq("id", providerId)
    .eq("tenant_id", tenantId);
  if (error) {
    if (error.code === "23505") return { error: "A provider with that name already exists in this category." };
    return { error: error.message };
  }

  revalidateProviders();
  return { error: null };
}

export async function deleteProvider(tenantId: string, providerId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("service_providers")
    .delete()
    .eq("id", providerId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidateProviders();
  return { error: null };
}
