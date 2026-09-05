"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  /** Called with the new order's id when one was just created, so the list can jump to and highlight it — omitted on edit/cancel. */
  onDone: (createdId?: string) => void;
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

  // Item photo can come from the native file picker or be pasted straight
  // from the clipboard (a screenshot, or an image copied off a shopping
  // site) — both funnel into this one piece of state, which is what
  // actually gets sent as the "image" field on submit, overriding
  // whatever (if anything) the native input itself holds.
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived, not stateful — createObjectURL is a pure-enough read for
  // render, and computing it here (rather than via setState inside an
  // effect) avoids an extra cascading render. The effect below only
  // handles the one real side effect: revoking the previous URL once
  // it's no longer the current one.
  const newFilePreviewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  useEffect(() => {
    return () => {
      if (newFilePreviewUrl) URL.revokeObjectURL(newFilePreviewUrl);
    };
  }, [newFilePreviewUrl]);
  // Falls back to the order's already-saved photo when nothing new has
  // been picked/pasted yet — without this, opening Edit on an order that
  // already has a photo showed an empty box, making it look like the
  // photo had been lost (it hadn't: addShoppingOrder/updateShoppingOrder
  // only ever replace the saved photo when a real new file comes through,
  // this was purely a missing preview).
  const previewUrl = newFilePreviewUrl ?? editing?.imageUrl ?? null;

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          if (fileInputRef.current) fileInputRef.current.value = "";
          setImageFile(file);
        }
        break;
      }
    }
  }

  function clearImage() {
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    // The native input's own "image" entry (if any) came from the file
    // picker; a pasted image never touches that input, so it always
    // takes precedence here when present.
    if (imageFile) formData.set("image", imageFile);
    startTransition(async () => {
      // Split rather than a shared `result` — addShoppingOrder's success
      // shape carries an `id` (so the list can jump to it) that
      // updateShoppingOrder's doesn't, and a single ternary'd result
      // variable can't narrow to that per-branch.
      if (editing) {
        const result = await updateShoppingOrder(tenantId, editing.id, formData);
        if (result.error !== null) {
          setError(result.error);
          return;
        }
        router.refresh();
        onDone();
      } else {
        const result = await addShoppingOrder(tenantId, formData);
        // !== null, not a truthy check — TS otherwise can't rule out the
        // {error: string} branch here (an empty string is falsy but still
        // a string, not null), so `result.id` below wouldn't narrow.
        if (result.error !== null) {
          setError(result.error);
          return;
        }
        router.refresh();
        onDone(result.id);
      }
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

        <ProviderPicker providers={providers} label="Seller (optional)" defaultValue={editing?.providerId} />

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
          <div
            onPaste={handlePaste}
            tabIndex={0}
            className="flex flex-col gap-2 border border-dashed border-line rounded-lg p-3 outline-none focus:border-primary transition"
          >
            <input
              ref={fileInputRef}
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className={`${field} file:mr-3 file:border-0 file:bg-surface-2 file:text-ink file:rounded-md file:px-2.5 file:py-1 file:text-xs`}
            />
            <p className="text-[.7rem] text-muted">
              …or click in this box and press Ctrl+V (⌘V on Mac) to paste an image from your clipboard
            </p>
            {previewUrl && (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Selected item photo" className="w-14 h-14 rounded-md object-cover border border-line" />
                {newFilePreviewUrl ? (
                  <button type="button" onClick={clearImage} className="text-xs text-coral hover:underline">
                    Remove
                  </button>
                ) : (
                  <span className="text-[.7rem] text-muted">Current photo — pick or paste a new one to replace it</span>
                )}
              </div>
            )}
          </div>
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
          <button type="button" onClick={() => onDone()} className="text-xs text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
