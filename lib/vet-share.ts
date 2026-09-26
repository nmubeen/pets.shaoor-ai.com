// The household's no-login share links for /app/vet-view — each one is a
// unique, unguessable token (app/v/[token]/page.tsx) handed to a vet over
// WhatsApp so they can open the same read-only summary without an account.
// Several can be active at once (one per vet, or a fresh one per visit),
// unlike a single per-parent link elsewhere, so this is a list, not a
// single row lookup.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { authAppConfig } from "@/lib/auth/config";

type Db = SupabaseClient<Database, "menagerie">;

export type VetShareLink = {
  id: string;
  whatsappNumber: string;
  url: string;
  createdAt: string;
  revokedAt: string | null;
  lastViewedAt: string | null;
};

type VetShareLinkRow = {
  id: string;
  whatsapp_number: string;
  token: string;
  created_at: string;
  revoked_at: string | null;
  last_viewed_at: string | null;
};

export function toVetShareLink(row: VetShareLinkRow): VetShareLink {
  return {
    id: row.id,
    whatsappNumber: row.whatsapp_number,
    url: `${authAppConfig.siteUrl}/v/${row.token}`,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
    lastViewedAt: row.last_viewed_at,
  };
}

/** Newest first — matches every other list in this app. */
export async function getVetShareLinks(supabase: Db, tenantId: string): Promise<VetShareLink[]> {
  const { data } = await supabase
    .from("vet_share_links")
    .select("id, whatsapp_number, token, created_at, revoked_at, last_viewed_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(toVetShareLink);
}
