import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { ServiceProviderCategory } from "@/lib/database.types";

export type Provider = {
  id: string;
  category: ServiceProviderCategory;
  name: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
};

export async function getProviders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  categories?: ServiceProviderCategory[]
): Promise<Provider[]> {
  let query = supabase
    .from("service_providers")
    .select("id, category, name, phone, address, website, notes")
    .eq("tenant_id", tenantId)
    .order("name");
  if (categories && categories.length > 0) {
    query = query.in("category", categories);
  }
  const { data } = await query;
  return data ?? [];
}
