"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAdoptable } from "@/lib/actions/gallery";

export function AdoptionToggle({
  tenantId,
  petId,
  isAdoptable,
  adoptionNote,
}: {
  tenantId: string;
  petId: string;
  isAdoptable: boolean;
  adoptionNote: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(adoptionNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save(nextAdoptable: boolean, nextNote: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await setAdoptable(tenantId, petId, nextAdoptable, nextNote);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (isAdoptable && !editing) {
    return (
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-good font-medium">🏡 Listed for adoption</span>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="text-muted hover:text-ink transition">
            Edit
          </button>
          <button
            disabled={pending}
            onClick={() => save(false, adoptionNote)}
            className="text-muted hover:text-coral transition disabled:opacity-60"
          >
            Unlist
          </button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="A short adoption bio, shown publicly…"
          rows={2}
          className="bg-paper border border-line rounded-lg px-2.5 py-2 text-xs outline-none focus:border-primary transition resize-none"
        />
        {error && <p className="text-xs text-coral">{error}</p>}
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={() => {
              save(true, note || null);
              setEditing(false);
            }}
            className="text-xs font-semibold bg-good/15 text-good px-2.5 py-1.5 rounded-md transition disabled:opacity-60"
          >
            {pending ? "Saving…" : "List for adoption"}
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="text-xs text-muted hover:text-ink transition self-start">
      List for adoption
    </button>
  );
}
