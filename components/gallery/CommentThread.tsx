"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fetchComments, addComment } from "@/lib/actions/gallery";
import type { CommentItem } from "@/lib/gallery";

export function CommentThread({
  tenantId,
  mediaId,
  canPost,
}: {
  tenantId: string;
  mediaId: string;
  /** Comments themselves are always visible (RLS already allows any tenant member to read them) — this only gates the "add a comment" form, since viewer/vet_view submitting one would just fail server-side (menagerie.can_social_interact_tenant()). */
  canPost: boolean;
}) {
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetchComments(tenantId, mediaId).then((result) => {
      if (!cancelled) setComments(result);
    });
    return () => {
      cancelled = true;
    };
  }, [tenantId, mediaId]);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addComment(tenantId, mediaId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      const fresh = await fetchComments(tenantId, mediaId);
      setComments(fresh);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-[.05em] text-muted">Comments</div>
      {comments === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted">No comments yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {comments.map((c) => (
            <div key={c.id} className="text-sm">
              <span className="font-medium">{c.author}</span>{" "}
              <span className="text-muted">{c.body}</span>
            </div>
          ))}
        </div>
      )}

      {canPost && (
        <form
          action={handleSubmit}
          className="flex gap-2"
          onSubmit={(e) => {
            const form = e.currentTarget;
            requestAnimationFrame(() => form.reset());
          }}
        >
          <input
            name="body"
            required
            placeholder="Add a comment…"
            className="flex-1 bg-paper border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition"
          />
          <button
            type="submit"
            disabled={pending}
            className="text-sm font-semibold bg-accent text-accent-ink px-3.5 py-2 rounded-lg hover:brightness-95 transition disabled:opacity-60"
          >
            {pending ? "…" : "Post"}
          </button>
        </form>
      )}
      {error && <p className="text-xs text-coral">{error}</p>}
    </div>
  );
}
