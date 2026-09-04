"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { ScopePicker } from "@/components/scope/ScopePicker";
import { addShoppingOrder } from "@/lib/actions/shopping";
import type { RosterItem } from "@/lib/roster";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

export function LogOrderForm({
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

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addShoppingOrder(tenantId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <Card className="p-5">
      <form action={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Item</span>
          <input name="item" required className={field} placeholder="Grain-free kibble, 5kg" />
        </label>

        <ScopePicker roster={roster} allowHousehold />

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Date</span>
            <input type="date" name="order_date" className={field} defaultValue={new Date().toISOString().slice(0, 10)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Cost (optional)</span>
            <input type="number" name="cost" min="0" step="0.01" className={field} placeholder="0" />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Notes (optional)</span>
          <input name="notes" className={field} placeholder="" />
        </label>

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onDone} className="text-xs text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
