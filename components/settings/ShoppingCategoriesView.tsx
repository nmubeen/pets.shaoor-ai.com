"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PlusIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { CareTabs } from "@/components/settings/CareTabs";
import { addShoppingCategory, updateShoppingCategory, deleteShoppingCategory } from "@/lib/actions/shopping-categories";
import type { ShoppingCategory } from "@/lib/shopping-categories";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";
const th = "text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line";

function CategoryForm({
  tenantId,
  initial,
  onDone,
}: {
  tenantId: string;
  initial?: ShoppingCategory;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = initial
        ? await updateShoppingCategory(tenantId, initial.id, formData)
        : await addShoppingCategory(tenantId, formData);
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
        <label className="flex flex-col gap-1.5 max-w-sm">
          <span className={label}>Name</span>
          <input name="name" required defaultValue={initial?.name} className={field} placeholder="Food" />
        </label>

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition disabled:opacity-60"
          >
            {pending ? "Saving…" : initial ? "Save changes" : "Add"}
          </button>
          <button type="button" onClick={onDone} className="text-xs text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

function RowActions({
  tenantId,
  categoryId,
  onEdit,
}: {
  tenantId: string;
  categoryId: string;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <button onClick={onEdit} className="text-muted hover:text-ink border border-line rounded-md p-1.5 transition" aria-label="Edit category" title="Edit">
        <PencilIcon className="w-4 h-4" />
      </button>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (!confirm("Delete this category? Past orders that used it keep their record — this only removes it from the dropdown.")) return;
            await deleteShoppingCategory(tenantId, categoryId);
            router.refresh();
          })
        }
        className="text-muted hover:text-coral border border-line rounded-md p-1.5 transition disabled:opacity-60"
        aria-label="Delete category"
        title="Delete"
      >
        {pending ? "…" : <TrashIcon className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function ShoppingCategoriesView({ tenantId, categories }: { tenantId: string; categories: ShoppingCategory[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ShoppingCategory | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Care</h1>
          <p className="text-sm text-muted">
            Food, toys, grooming, accessories… the categories logging an order in Shopping picks from. Add as many as you need.
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setEditing(null);
          }}
          className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition"
        >
          <PlusIcon className="w-[.9em] h-[.9em]" />
          Add category
        </button>
      </div>

      <CareTabs active="categories" />

      {(showForm || editing) && (
        <CategoryForm
          tenantId={tenantId}
          initial={editing ?? undefined}
          onDone={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {categories.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">None yet — add one to start categorizing orders.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface-2">
                <th className={th}>Name</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-none">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">
                    <RowActions
                      tenantId={tenantId}
                      categoryId={c.id}
                      onEdit={() => {
                        setEditing(c);
                        setShowForm(false);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
