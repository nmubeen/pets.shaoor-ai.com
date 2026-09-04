// Fetches gallery media (with signed URLs — the "media" Storage bucket is
// private, per §06 of the design doc) and comments for /app/gallery.
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getRoster } from "@/lib/roster";
import { pickScopeId } from "@/lib/scope";

export type MediaItem = {
  id: string;
  url: string | null;
  caption: string | null;
  who: string;
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

export async function getMediaItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<MediaItem[]> {
  const [{ data }, roster, { data: comments }] = await Promise.all([
    supabase
      .from("media")
      .select("id, pet_id, habitat_id, storage_path, caption, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    getRoster(supabase, tenantId),
    supabase.from("comments").select("media_id").eq("tenant_id", tenantId),
  ]);

  const byId = new Map(roster.map((r) => [r.id, r.name]));
  const items = data ?? [];

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
    const scopeId = pickScopeId(m);
    return {
      id: m.id,
      url: urlByPath.get(m.storage_path) ?? null,
      caption: m.caption,
      who: scopeId ? (byId.get(scopeId) ?? "Unknown") : "Household",
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
