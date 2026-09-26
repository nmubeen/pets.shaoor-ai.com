"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/errors";
import { toVetShareLink, type VetShareLink } from "@/lib/vet-share";

/** 32 URL-safe characters — 192 bits, plenty to be unguessable by brute force. */
function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Creates a fresh no-login share link for this household's Vet View
 * (app/v/[token]/page.tsx) for the given WhatsApp number. Always a new
 * token — unlike a per-parent link elsewhere, there's no single "the vet"
 * to key an idempotent link off of, so the same household can hand out
 * several of these (one per vet, or a new one each visit).
 */
export async function createVetShareLink(tenantId: string, whatsappNumber: string): Promise<{ link: VetShareLink } | { error: string }> {
  const number = whatsappNumber.trim();
  if (!number) return { error: "Enter a WhatsApp number." };

  const supabase = await createClient();
  const token = generateToken();
  const { data, error } = await supabase
    .from("vet_share_links")
    .insert({ tenant_id: tenantId, whatsapp_number: number, token })
    .select("id, whatsapp_number, token, created_at, revoked_at, last_viewed_at")
    .single();
  if (error || !data) return { error: friendlyErrorMessage(error ?? { message: "Could not create the link." }) };

  revalidatePath("/app/vet-view");
  return { link: toVetShareLink(data) };
}

/** Immediately invalidates one share link — for right after the vet visit, or if it was sent to the wrong number. The number itself stays on record; only the token stops resolving. */
export async function revokeVetShareLink(tenantId: string, linkId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("vet_share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", linkId)
    .is("revoked_at", null);

  revalidatePath("/app/vet-view");
  return { error: error ? friendlyErrorMessage(error) : null };
}
