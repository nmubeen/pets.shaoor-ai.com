"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { ImageIcon, PlusIcon } from "@/components/icons";
import { UploadForm } from "@/components/gallery/UploadForm";
import { CommentThread } from "@/components/gallery/CommentThread";
import { deleteMedia } from "@/lib/actions/gallery";
import type { MediaItem } from "@/lib/gallery";
import type { RosterItem } from "@/lib/roster";

const FILTER_ALL = "all";
const FILTER_HOUSEHOLD = "household";

export function GalleryView({
  tenantId,
  roster,
  media,
}: {
  tenantId: string;
  roster: RosterItem[];
  media: MediaItem[];
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState(FILTER_ALL);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const open = media.find((m) => m.id === openId) ?? null;
  const filtered =
    filter === FILTER_ALL
      ? media
      : filter === FILTER_HOUSEHOLD
        ? media.filter((m) => m.scopeIds.length === 0)
        : media.filter((m) => m.scopeIds.includes(filter));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Gallery</h1>
          <p className="text-sm text-muted">Photos and memories — newest clicked date first</p>
        </div>
        {roster.length > 0 && (
          <button
            onClick={() => setShowUpload((v) => !v)}
            className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition"
          >
            <PlusIcon className="w-[.9em] h-[.9em]" />
            Upload photo
          </button>
        )}
      </div>

      {media.length > 0 && (
        <label className="flex flex-col gap-1.5 max-w-xs">
          <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Whose gallery</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
          >
            <option value={FILTER_ALL}>All photos</option>
            <option value={FILTER_HOUSEHOLD}>🏠 Household (untagged)</option>
            {roster.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {showUpload && <UploadForm tenantId={tenantId} roster={roster} onDone={() => setShowUpload(false)} />}

      {media.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">No photos yet — upload the first one.</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">No photos here yet.</Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => setOpenId(item.id)}
              className={`flex flex-col gap-2 text-left rounded-[10px] transition ${
                openId === item.id ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="aspect-square rounded-[10px] border border-line overflow-hidden bg-surface-2 flex items-center justify-center">
                {item.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.caption ?? item.who} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="text-2xl text-muted" />
                )}
              </div>
              <div className="text-xs font-medium truncate">{item.caption || item.who}</div>
              <div className="text-[.68rem] text-muted truncate">
                {item.who} · {item.clickedDate}
                {item.commentCount > 0 && ` · ${item.commentCount} comment${item.commentCount === 1 ? "" : "s"}`}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <Card className="p-5 flex flex-col gap-4 md:flex-row">
          <div className="md:w-1/2 aspect-square rounded-[10px] border border-line overflow-hidden bg-surface-2 flex items-center justify-center flex-none">
            {open.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={open.url} alt={open.caption ?? open.who} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="text-3xl text-muted" />
            )}
          </div>
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-sm">{open.caption || open.who}</div>
                <div className="text-xs text-muted">
                  {open.who} · {open.clickedDate}
                </div>
              </div>
              <button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteMedia(tenantId, open.id);
                    setOpenId(null);
                    router.refresh();
                  })
                }
                className="text-xs text-muted hover:text-coral transition disabled:opacity-60"
              >
                {pending ? "…" : "Delete"}
              </button>
            </div>
            <CommentThread tenantId={tenantId} mediaId={open.id} />
          </div>
        </Card>
      )}
    </div>
  );
}
