"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { CareTabs } from "@/components/settings/CareTabs";
import { SpeciesFilterSelect } from "@/components/settings/SpeciesFilterSelect";
import { addServiceType, updateServiceType, deleteServiceType } from "@/lib/actions/care-services";
import { SPECIES_LIST, SPECIES_LABEL } from "@/lib/species-labels";
import type { ServiceType } from "@/lib/care-services";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";
const th = "text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line";

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
    <Card className="p-5">
      <form action={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Name</span>
            <input name="name" required defaultValue={initial?.name} className={field} placeholder="Deworming" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Species (optional — blank = any species)</span>
            <select name="species" defaultValue={initial?.species ?? ""} className={field}>
              <option value="">Any species</option>
              {SPECIES_LIST.map((value) => (
                <option key={value} value={value}>
                  {SPECIES_LABEL[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
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
        </div>

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
  serviceTypeId,
  onEdit,
}: {
  tenantId: string;
  serviceTypeId: string;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <button onClick={onEdit} className="text-xs text-muted hover:text-ink border border-line rounded-md px-2 py-1 transition">
        Edit
      </button>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (!confirm("Delete this service? Past visits that used it keep their record — this only removes it from the list.")) return;
            await deleteServiceType(tenantId, serviceTypeId);
            router.refresh();
          })
        }
        className="text-xs text-muted hover:text-coral border border-line rounded-md px-2 py-1 transition disabled:opacity-60"
      >
        {pending ? "…" : "Delete"}
      </button>
    </div>
  );
}

export function ServiceTypesView({ tenantId, serviceTypes }: { tenantId: string; serviceTypes: ServiceType[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServiceType | null>(null);
  const [speciesFilter, setSpeciesFilter] = useState("all");

  // Same "specific to this species, or generic" narrowing as the visit
  // form's own service suggestions (findOrCreateServiceType) — a generic
  // (no species) entry applies to every species, so it never disappears
  // just because a filter is picked.
  const rows =
    speciesFilter === "all" ? serviceTypes : serviceTypes.filter((s) => s.species === null || s.species === speciesFilter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Care</h1>
          <p className="text-sm text-muted">
            Deworming, nail clipping, grooming, consultation… give one a frequency to get an automatic reminder each
            time it&rsquo;s logged on a visit. Typing a new one on a visit adds it here too, tagged to that
            pet&rsquo;s species.
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
          Add service type
        </button>
      </div>

      <CareTabs active="service-types" />
      <SpeciesFilterSelect value={speciesFilter} onChange={setSpeciesFilter} />

      {(showForm || editing) && (
        <ServiceTypeForm
          tenantId={tenantId}
          initial={editing ?? undefined}
          onDone={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          {serviceTypes.length === 0 ? "None yet — typing a new one on a visit adds it here too." : "No service types for this species."}
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface-2">
                <th className={th}>Name</th>
                <th className={th}>Species</th>
                <th className={th}>Frequency</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-none">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted">{s.species ? SPECIES_LABEL[s.species] : "Any species"}</td>
                  <td className="px-4 py-3 text-muted">{s.frequencyDays ? `Every ${s.frequencyDays} days` : "No reminder"}</td>
                  <td className="px-4 py-3">
                    <RowActions
                      tenantId={tenantId}
                      serviceTypeId={s.id}
                      onEdit={() => {
                        setEditing(s);
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
