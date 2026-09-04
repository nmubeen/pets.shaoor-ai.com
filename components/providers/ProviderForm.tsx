"use client";

import { useState, useTransition } from "react";
import { Card, Avatar } from "@/components/ui";
import { addProvider, updateProvider } from "@/lib/actions/providers";
import type { Provider } from "@/lib/providers";
import type { ServiceProviderCategory } from "@/lib/database.types";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

export function ProviderForm({
  tenantId,
  category,
  mode = "add",
  initial,
  onDone,
}: {
  tenantId: string;
  category: ServiceProviderCategory;
  mode?: "add" | "edit";
  initial?: Provider;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isOnlineShop = category === "online_shop";

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result =
        mode === "edit" && initial
          ? await updateProvider(tenantId, initial.id, formData)
          : await addProvider(tenantId, category, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <Card className="p-5">
      <form action={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Name</span>
          <input
            name="name"
            required
            defaultValue={initial?.name}
            className={field}
            placeholder={isOnlineShop ? "Amazon" : category === "vet" ? "City Pet Hospital" : "Name"}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Logo / photo (optional)</span>
          {mode === "edit" && initial?.logoUrl && (
            <div className="flex items-center gap-2.5 mb-1">
              <Avatar label={initial.initials} color={initial.color} photoUrl={initial.logoUrl} />
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input type="checkbox" name="remove_logo" className="accent-coral" />
                Remove current logo
              </label>
            </div>
          )}
          {mode === "edit" && <input type="hidden" name="current_logo_path" value={initial?.logoPath ?? ""} />}
          <input
            type="file"
            name="logo"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className={`${field} file:mr-3 file:border-0 file:bg-surface-2 file:text-ink file:rounded-md file:px-2.5 file:py-1 file:text-xs`}
          />
        </label>

        {!isOnlineShop && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={label}>Phone (optional)</span>
              <input name="phone" defaultValue={initial?.phone ?? ""} className={field} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Address (optional)</span>
              <input name="address" defaultValue={initial?.address ?? ""} className={field} />
            </label>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className={label}>Website (optional)</span>
          <input
            name="website"
            type="url"
            defaultValue={initial?.website ?? ""}
            className={field}
            placeholder="https://…"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Notes (optional)</span>
          <input name="notes" defaultValue={initial?.notes ?? ""} className={field} />
        </label>

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition disabled:opacity-60"
          >
            {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Add"}
          </button>
          <button type="button" onClick={onDone} className="text-xs text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
