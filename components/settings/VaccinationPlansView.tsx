"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PlusIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { CareTabs } from "@/components/settings/CareTabs";
import { SpeciesFilterSelect } from "@/components/settings/SpeciesFilterSelect";
import { addVaccinationPlan, updateVaccinationPlan, deleteVaccinationPlan } from "@/lib/actions/vaccination-plans";
import { SPECIES_LIST, SPECIES_LABEL } from "@/lib/species-labels";
import type { VaccinationPlan } from "@/lib/vaccination-plans";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";
const th = "text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line";

function PlanForm({
  tenantId,
  initial,
  onDone,
}: {
  tenantId: string;
  initial?: VaccinationPlan;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = initial
        ? await updateVaccinationPlan(tenantId, initial.id, formData)
        : await addVaccinationPlan(tenantId, formData);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Species</span>
            <select name="species" required defaultValue={initial?.species ?? ""} className={field}>
              <option value="" disabled>
                Choose a species
              </option>
              {SPECIES_LIST.map((value) => (
                <option key={value} value={value}>
                  {SPECIES_LABEL[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Vaccine name</span>
            <input name="vaccine_name" required defaultValue={initial?.vaccineName} className={field} placeholder="Rabies" />
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Age when due (weeks)</span>
            <input
              type="number"
              name="age_weeks_due"
              min="0"
              required
              defaultValue={initial?.ageWeeksDue}
              className={field}
              placeholder="12"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Booster every (months, optional)</span>
            <input
              type="number"
              name="booster_interval_months"
              min="1"
              defaultValue={initial?.boosterIntervalMonths ?? ""}
              className={field}
              placeholder="No booster"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={label}>Purpose (optional)</span>
          <input name="notes" defaultValue={initial?.notes ?? ""} className={field} placeholder="Prevents rabies virus" />
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

function RowActions({ tenantId, planId, onEdit }: { tenantId: string; planId: string; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <button onClick={onEdit} className="text-muted hover:text-ink border border-line rounded-md p-1.5 transition" aria-label="Edit plan" title="Edit">
        <PencilIcon className="w-4 h-4" />
      </button>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (!confirm("Delete this vaccination plan entry?")) return;
            await deleteVaccinationPlan(tenantId, planId);
            router.refresh();
          })
        }
        className="text-muted hover:text-coral border border-line rounded-md p-1.5 transition disabled:opacity-60"
        aria-label="Delete plan"
        title="Delete"
      >
        {pending ? "…" : <TrashIcon className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function VaccinationPlansView({ tenantId, plans }: { tenantId: string; plans: VaccinationPlan[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VaccinationPlan | null>(null);
  const [speciesFilter, setSpeciesFilter] = useState("all");

  const rows = speciesFilter === "all" ? plans : plans.filter((p) => p.species === speciesFilter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Care</h1>
          <p className="text-sm text-muted">
            Built-in defaults for dogs and cats, plus your own — useful for a species with no default, or a vaccine
            the defaults miss. &ldquo;Suggest schedule&rdquo; on a pet&rsquo;s card uses whichever plans match its
            species.
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
          Add vaccination plan
        </button>
      </div>

      <CareTabs active="vaccinations" />
      <SpeciesFilterSelect value={speciesFilter} onChange={setSpeciesFilter} />

      {(showForm || editing) && (
        <PlanForm
          tenantId={tenantId}
          initial={editing ?? undefined}
          onDone={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">No vaccination plans for this species.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface-2">
                <th className={th}>Vaccine</th>
                <th className={th}>Species</th>
                <th className={th}>Due at</th>
                <th className={th}>Booster</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-none">
                  <td className="px-4 py-3 font-medium">
                    {p.vaccineName}
                    {p.notes && <div className="text-xs text-muted mt-0.5 font-normal">{p.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted">{SPECIES_LABEL[p.species]}</td>
                  <td className="px-4 py-3 text-muted">{p.ageWeeksDue}wk</td>
                  <td className="px-4 py-3 text-muted">{p.boosterIntervalMonths ? `Every ${p.boosterIntervalMonths}mo` : "—"}</td>
                  <td className="px-4 py-3">
                    {p.isBuiltIn ? (
                      <span className="text-[.68rem] text-muted">Built-in</span>
                    ) : (
                      <RowActions
                        tenantId={tenantId}
                        planId={p.id}
                        onEdit={() => {
                          setEditing(p);
                          setShowForm(false);
                        }}
                      />
                    )}
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
