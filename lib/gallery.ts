// Fetches gallery media (with signed URLs — the "media" Storage bucket is
// private, per §06 of the design doc) and comments for /app/gallery.
// Scope went many-to-many in 0023_gallery_multiscope_clicked_date.sql
// (media_scopes) — a photo can tag any combination of pets/habitats, so
// "who" is a list here instead of a single lookup, same shape as
// lib/shopping.ts's getShoppingOrders. Always sorted by clicked_date (the
// date the photo was actually taken, not when it was uploaded), newest
// first.
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getRoster } from "@/lib/roster";

export type MediaItem = {
  id: string;
  url: string | null;
  caption: string | null;
  who: string;
  scopeIds: string[];
  clickedDate: string;
  clickedDateIso: string;
  createdAt: string;
  commentCount: number;
};

export type CommentItem = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
};

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

export async function getMediaItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<MediaItem[]> {
  const [{ data }, { data: scopeRows }, roster, { data: comments }] = await Promise.all([
    supabase
      .from("media")
      .select("id, storage_path, caption, clicked_date, created_at")
      .eq("tenant_id", tenantId)
      .order("clicked_date", { ascending: false }),
    supabase.from("media_scopes").select("media_id, pet_id, habitat_id").eq("tenant_id", tenantId),
    getRoster(supabase, tenantId),
    supabase.from("comments").select("media_id").eq("tenant_id", tenantId),
  ]);

  const byId = new Map(roster.map((r) => [r.id, r.name]));
  const items = data ?? [];

  const scopesByMedia = new Map<string, string[]>();
  for (const row of scopeRows ?? []) {
    const scopeId = row.pet_id ?? row.habitat_id;
    if (!scopeId) continue;
    const list = scopesByMedia.get(row.media_id) ?? [];
    list.push(scopeId);
    scopesByMedia.set(row.media_id, list);
  }

  const commentCounts = new Map<string, number>();
  for (const c of comments ?? []) {
    commentCounts.set(c.media_id, (commentCounts.get(c.media_id) ?? 0) + 1);
  }

  const { data: signed } = items.length
    ? await supabase.storage.from("media").createSignedUrls(
        items.map((m) => m.storage_path),
        SIGNED_URL_TTL_SECONDS
      )
    : { data: [] as { path: string | null; signedUrl: string | null }[] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return items.map((m) => {
    const scopeIds = scopesByMedia.get(m.id) ?? [];
    const names = scopeIds.map((id) => byId.get(id) ?? "Unknown");
    return {
      id: m.id,
      url: urlByPath.get(m.storage_path) ?? null,
      caption: m.caption,
      who: names.length > 0 ? names.join(", ") : "Household",
      scopeIds,
      clickedDate: fmtDate(m.clicked_date),
      clickedDateIso: m.clicked_date,
      createdAt: m.created_at,
      commentCount: commentCounts.get(m.id) ?? 0,
    };
  });
}

export async function getComments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  mediaId: string
): Promise<CommentItem[]> {
  const [{ data: comments }, { data: members }] = await Promise.all([
    supabase
      .from("comments")
      .select("id, body, author_id, created_at")
      .eq("tenant_id", tenantId)
      .eq("media_id", mediaId)
      .order("created_at", { ascending: true }),
    supabase.from("memberships").select("user_id, invited_email").eq("tenant_id", tenantId),
  ]);

  const emailByUserId = new Map((members ?? []).map((m) => [m.user_id, m.invited_email]));

  return (comments ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    author: (c.author_id && emailByUserId.get(c.author_id)) || "Unknown",
    createdAt: c.created_at,
  }));
}
