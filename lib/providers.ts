import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { ServiceProviderCategory } from "@/lib/database.types";

export type Provider = {
  id: string;
  category: ServiceProviderCategory;
  name: string;
  phone: string | null;
  /** Vets/Hospitals only in the form — the column itself is open to any category, same as phone/address. */
  email: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  initials: string;
  color: string;
  logoPath: string | null;
  logoUrl: string | null;
  /** A pasted map link (Google Maps "Share" URL or similar) — not derived, entered directly. */
  locationUrl: string | null;
  businessHours: string | null;
};

const COLORS = [
  "var(--accent)",
  "var(--coral)",
  "var(--trial)",
  "var(--good)",
  "var(--org)",
  "var(--primary)",
];

const SIGNED_URL_TTL_SECONDS = 60 * 60;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export async function getProviders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  categories?: ServiceProviderCategory[]
): Promise<Provider[]> {
  let query = supabase
    .from("service_providers")
    .select("id, category, name, phone, email, address, website, notes, logo_path, location_url, business_hours")
    .eq("tenant_id", tenantId)
    .order("name");
  if (categories && categories.length > 0) {
    query = query.in("category", categories);
  }
  const { data } = await query;
  const rows = data ?? [];

  const paths = rows.map((r) => r.logo_path).filter((p): p is string => p !== null);
  const { data: signed } = paths.length
    ? await supabase.storage.from("media").createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
    : { data: [] as { path: string | null; signedUrl: string | null }[] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return rows.map((r, i) => ({
    id: r.id,
    category: r.category,
    name: r.name,
    phone: r.phone,
    email: r.email,
    address: r.address,
    website: r.website,
    notes: r.notes,
    initials: initialsFor(r.name),
    color: COLORS[i % COLORS.length],
    logoPath: r.logo_path,
    logoUrl: r.logo_path ? (urlByPath.get(r.logo_path) ?? null) : null,
    locationUrl: r.location_url,
    businessHours: r.business_hours,
  }));
}
