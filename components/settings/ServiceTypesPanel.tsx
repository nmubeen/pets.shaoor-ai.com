"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { addServiceType, updateServiceType, deleteServiceType } from "@/lib/actions/care-services";
import type { ServiceType } from "@/lib/care-services";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

function ServiceTypeForm({
  tenantId,
  initial,
  onDone,
}: {
  tenantId: string;
  initial?: ServiceType;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = initial
        ? await updateServiceType(tenantId, initial.id, formData)
        : await addServiceType(tenantId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 sm:items-end border border-line rounded-lg p-3">
      <label className="flex flex-col gap-1.5 flex-1">
        <span className={label}>Name</span>
        <input name="name" required defaultValue={initial?.name} className={field} placeholder="Deworming" />
      </label>
      <label className="flex flex-col gap-1.5 sm:w-56">
        <span className={label}>Repeats every (days, optional)</span>
        <input
          type="number"
          name="frequency_days"
          min="1"
          defaultValue={initial?.frequencyDays ?? ""}
          className={field}
          placeholder="No reminder"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="text-sm font-semibold bg-accent text-accent-ink px-3.5 py-2.5 rounded-lg hover:brightness-95 transition disabled:opacity-60"
        >
          {pending ? "Saving…" : initial ? "Save" : "Add"}
        </button>
        <button type="button" onClick={onDone} className="text-xs text-muted hover:text-ink self-center">
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-coral w-full">{error}</p>}
    </form>
  );
}

function DeleteButton({ tenantId, serviceTypeId }: { tenantId: string; serviceTypeId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (!confirm("Delete this service? Past visits that used it keep their record — this only removes it from the list.")) return;
          await deleteServiceType(tenantId, serviceTypeId);
          router.refresh();
        })
      }
      className="text-xs text-muted hover:text-coral transition disabled:opacity-60"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}

export function ServiceTypesPanel({ tenantId, serviceTypes }: { tenantId: string; serviceTypes: ServiceType[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold">Service types</h2>
          <p className="text-xs text-muted mt-0.5">
            Deworming, nail clipping, grooming, consultation… give one a frequency to get an automatic reminder each
            time it&rsquo;s logged on a visit. Typing a new one on a visit adds it here too.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setShowAdd((v) => !v);
          }}
          className="text-xs text-primary hover:underline flex-none"
        >
          + Add service
        </button>
      </div>

      {showAdd && (
        <div className="mb-3">
          <ServiceTypeForm
            tenantId={tenantId}
            onDone={() => {
              setShowAdd(false);
              router.refresh();
            }}
          />
        </div>
      )}

      {serviceTypes.length === 0 ? (
        <p className="text-xs text-muted">None yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line">
          {serviceTypes.map((s) =>
            editingId === s.id ? (
              <div key={s.id} className="py-2.5">
                <ServiceTypeForm
                  tenantId={tenantId}
                  initial={s}
                  onDone={() => {
                    setEditingId(null);
                    router.refresh();
                  }}
                />
              </div>
            ) : (
              <div key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted"> — {s.frequencyDays ? `every ${s.frequencyDays} days` : "no reminder"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditingId(s.id)} className="text-xs text-muted hover:text-ink transition">
                    Edit
                  </button>
                  <DeleteButton tenantId={tenantId} serviceTypeId={s.id} />
                </div>
              </div>
            )
          )}
        </div>
      )}
    </Card>
  );
}
