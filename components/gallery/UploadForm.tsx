"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { MultiScopePicker } from "@/components/scope/MultiScopePicker";
import { uploadMedia } from "@/lib/actions/gallery";
import type { RosterItem } from "@/lib/roster";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

export function UploadForm({
  tenantId,
  roster,
  onDone,
}: {
  tenantId: string;
  roster: RosterItem[];
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await uploadMedia(tenantId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      router.refresh();
      onDone();
    });
  }

  return (
    <Card className="p-5">
      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Photo</span>
          <input
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required
            className={`${field} file:mr-3 file:border-0 file:bg-surface-2 file:text-ink file:rounded-md file:px-2.5 file:py-1 file:text-xs`}
          />
        </label>

        <MultiScopePicker roster={roster} />

        <label className="flex flex-col gap-1.5">
          <span className={label}>Clicked date</span>
          <input
            type="date"
            name="clicked_date"
            className={field}
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Caption (optional)</span>
          <input name="caption" className={field} placeholder="Simba on the windowsill" />
        </label>

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition disabled:opacity-60"
          >
            {pending ? "Uploading…" : "Upload"}
          </button>
          <button type="button" onClick={onDone} className="text-xs text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
