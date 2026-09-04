"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadImage, removeImage } from "@/lib/storage";
import type { ServiceProviderCategory } from "@/lib/database.types";

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

/** Latitude/longitude are both-or-neither (DB constraint backs this up too). */
function gps(formData: FormData): { latitude: number | null; longitude: number | null } {
  const latitude = num(formData, "latitude");
  const longitude = num(formData, "longitude");
  if (latitude === null || longitude === null) return { latitude: null, longitude: null };
  return { latitude, longitude };
}

function revalidateProviders() {
  revalidatePath("/app/providers");
  revalidatePath("/app/health");
  revalidatePath("/app/shopping");
}

/** Mirrors lib/actions/roster.ts's resolvePhoto — see there for the contract. */
async function resolveLogo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  formData: FormData,
  currentPath: string | null
): Promise<{ logo_path?: string | null } | { error: string }> {
  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    const { path, error } = await uploadImage(supabase, tenantId, "providers", file);
    if (error || !path) return { error: error ?? "Logo upload failed." };
    await removeImage(supabase, currentPath);
    return { logo_path: path };
  }
  if (str(formData, "remove_logo") === "on" && currentPath) {
    await removeImage(supabase, currentPath);
    return { logo_path: null };
  }
  return {};
}

export async function addProvider(tenantId: string, category: ServiceProviderCategory, formData: FormData) {
  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const logo = await resolveLogo(supabase, tenantId, formData, null);
  if ("error" in logo) return logo;

  const { error } = await supabase.from("service_providers").insert({
    tenant_id: tenantId,
    category,
    name,
    phone: str(formData, "phone"),
    address: str(formData, "address"),
    website: str(formData, "website"),
    notes: str(formData, "notes"),
    business_hours: str(formData, "business_hours"),
    ...gps(formData),
    ...logo,
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
  const logo = await resolveLogo(supabase, tenantId, formData, str(formData, "current_logo_path"));
  if ("error" in logo) return logo;

  const { error } = await supabase
    .from("service_providers")
    .update({
      name,
      phone: str(formData, "phone"),
      address: str(formData, "address"),
      website: str(formData, "website"),
      notes: str(formData, "notes"),
      business_hours: str(formData, "business_hours"),
      ...gps(formData),
      ...logo,
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

  const { data: provider } = await supabase
    .from("service_providers")
    .select("logo_path")
    .eq("id", providerId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const { error } = await supabase
    .from("service_providers")
    .delete()
    .eq("id", providerId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  await removeImage(supabase, provider?.logo_path);

  revalidateProviders();
  return { error: null };
}
