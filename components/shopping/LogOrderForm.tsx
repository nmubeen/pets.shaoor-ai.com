"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui";
import { MultiScopePicker } from "@/components/scope/MultiScopePicker";
import { ProviderPicker } from "@/components/providers/ProviderPicker";
import { addShoppingOrder, updateShoppingOrder } from "@/lib/actions/shopping";
import type { ShoppingCategory } from "@/lib/shopping-categories";
import type { RosterItem } from "@/lib/roster";
import type { Provider } from "@/lib/providers";
import type { ShoppingOrderRow } from "@/lib/shopping";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

export function LogOrderForm({
  tenantId,
  roster,
  providers,
  categories,
  onDone,
  editing,
}: {
  tenantId: string;
  roster: RosterItem[];
  providers: Provider[];
  categories: ShoppingCategory[];
  onDone: () => void;
  /** Present when editing an existing order instead of logging a new one. */
  editing?: ShoppingOrderRow;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Delivered date defaults to whatever's typed into Ordered date, right
  // up until the person actually touches the Delivered field themselves
  // — after that we leave their choice alone. Editing an order that
  // already has an explicit delivered date starts "touched" so opening
  // Edit and tweaking the ordered date doesn't silently overwrite it.
  const [orderDate, setOrderDate] = useState(editing?.orderedDateIso ?? new Date().toISOString().slice(0, 10));
  const [deliveredDate, setDeliveredDate] = useState(editing?.deliveredDateIso ?? "");
  const deliveredTouched = useRef(!!editing?.deliveredDateIso);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = editing
        ? await updateShoppingOrder(tenantId, editing.id, formData)
        : await addShoppingOrder(tenantId, formData);
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
          <input name="item" required defaultValue={editing?.item} className={field} placeholder="Grain-free kibble, 5kg" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Category (optional)</span>
          <select name="category" defaultValue={editing?.category ?? ""} className={field}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <Link href="/app/settings/care/categories" className="text-[.7rem] text-primary hover:underline w-fit">
            Manage categories
          </Link>
        </label>

        <MultiScopePicker roster={roster} initialSelectedIds={editing?.scopeIds} />

        <ProviderPicker providers={providers} label="Bought from (optional)" defaultValue={editing?.providerId} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Ordered date</span>
            <input
              type="date"
              name="order_date"
              className={field}
              value={orderDate}
              onChange={(e) => {
                setOrderDate(e.target.value);
                if (!deliveredTouched.current) setDeliveredDate(e.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Delivered date (optional)</span>
            <input
              type="date"
              name="delivered_date"
              className={field}
              value={deliveredDate}
              onChange={(e) => {
                deliveredTouched.current = true;
                setDeliveredDate(e.target.value);
              }}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr] gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Qty (optional)</span>
            <input type="number" name="qty" min="0" step="0.01" defaultValue={editing?.qty ?? undefined} className={field} placeholder="1" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Unit (optional)</span>
            <input name="qty_unit" list="qty-units" defaultValue={editing?.qtyUnit ?? ""} className={field} placeholder="count" />
            <datalist id="qty-units">
              <option value="count" />
              <option value="kg" />
              <option value="g" />
              <option value="liter" />
              <option value="ml" />
              <option value="pack" />
              <option value="box" />
            </datalist>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Cost (optional)</span>
            <input type="number" name="cost" min="0" step="0.01" defaultValue={editing?.costValue ?? undefined} className={field} placeholder="0" />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Item URL (optional — for online orders)</span>
          <input type="url" name="item_url" defaultValue={editing?.itemUrl ?? ""} className={field} placeholder="https://…" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Item photo (optional{editing ? " — leave blank to keep the current one" : ""})</span>
          <input
            type="file"
            name="image"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className={`${field} file:mr-3 file:border-0 file:bg-surface-2 file:text-ink file:rounded-md file:px-2.5 file:py-1 file:text-xs`}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Notes (optional)</span>
          <input name="notes" defaultValue={editing?.notes ?? ""} className={field} placeholder="" />
        </label>

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition disabled:opacity-60"
          >
            {pending ? "Saving…" : editing ? "Save changes" : "Save"}
          </button>
          <button type="button" onClick={onDone} className="text-xs text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
