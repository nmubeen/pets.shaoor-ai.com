"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { addVaccinationPlan, updateVaccinationPlan, deleteVaccinationPlan } from "@/lib/actions/vaccination-plans";
import type { VaccinationPlan } from "@/lib/vaccination-plans";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

const SPECIES_LABEL: Record<string, string> = {
  dog: "Dog",
  cat: "Cat",
  bird: "Bird",
  reptile: "Reptile",
  fish: "Fish",
  small_mammal: "Small mammal",
  other: "Other",
};

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
    <form action={handleSubmit} className="flex flex-col gap-2.5 border border-line rounded-lg p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Species</span>
          <select name="species_group" required defaultValue={initial?.speciesGroup ?? ""} className={field}>
            <option value="" disabled>
              Choose a species
            </option>
            {Object.entries(SPECIES_LABEL).map(([value, l]) => (
              <option key={value} value={value}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>Vaccine name</span>
          <input name="vaccine_name" required defaultValue={initial?.vaccineName} className={field} placeholder="Rabies" />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="text-sm font-semibold bg-accent text-accent-ink px-3.5 py-2 rounded-lg hover:brightness-95 transition disabled:opacity-60"
        >
          {pending ? "Saving…" : initial ? "Save" : "Add"}
        </button>
        <button type="button" onClick={onDone} className="text-xs text-muted hover:text-ink self-center">
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeleteButton({ tenantId, planId }: { tenantId: string; planId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (!confirm("Delete this vaccination plan entry?")) return;
          await deleteVaccinationPlan(tenantId, planId);
          router.refresh();
        })
      }
      className="text-xs text-muted hover:text-coral transition disabled:opacity-60"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}

function PlanRow({ p, tenantId, onEdit }: { p: VaccinationPlan; tenantId: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm gap-3">
      <div className="min-w-0">
        <span className="font-medium">{p.vaccineName}</span>
        <span className="text-muted">
          {" "}
          — {SPECIES_LABEL[p.speciesGroup]} · due at {p.ageWeeksDue}wk
          {p.boosterIntervalMonths ? ` · booster every ${p.boosterIntervalMonths}mo` : ""}
        </span>
        {p.notes && <div className="text-xs text-muted mt-0.5">{p.notes}</div>}
      </div>
      {p.isBuiltIn ? (
        <span className="text-[.68rem] text-muted flex-none">Built-in</span>
      ) : (
        <div className="flex items-center gap-3 flex-none">
          <button onClick={onEdit} className="text-xs text-muted hover:text-ink transition">
            Edit
          </button>
          <DeleteButton tenantId={tenantId} planId={p.id} />
        </div>
      )}
    </div>
  );
}

export function VaccinationPlansPanel({ tenantId, plans }: { tenantId: string; plans: VaccinationPlan[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  const builtIn = plans.filter((p) => p.isBuiltIn);
  const custom = plans.filter((p) => !p.isBuiltIn);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold">Vaccination plans</h2>
          <p className="text-xs text-muted mt-0.5">
            Built-in defaults for dogs and cats, plus your own — useful for a species with no default, or a vaccine
            the defaults miss. &ldquo;Suggest schedule&rdquo; on a pet&rsquo;s card uses whichever plans match its
            species.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setShowAdd((v) => !v);
          }}
          className="text-xs text-primary hover:underline flex-none"
        >
          + Add plan
        </button>
      </div>

      {showAdd && (
        <div className="mb-3">
          <PlanForm
            tenantId={tenantId}
            onDone={() => {
              setShowAdd(false);
              router.refresh();
            }}
          />
        </div>
      )}

      {custom.length > 0 && (
        <div className="mb-4">
          <div className="text-[.68rem] uppercase tracking-[.05em] text-muted mb-1">Your plans</div>
          <div className="flex flex-col divide-y divide-line">
            {custom.map((p) =>
              editingId === p.id ? (
                <div key={p.id} className="py-2.5">
                  <PlanForm
                    tenantId={tenantId}
                    initial={p}
                    onDone={() => {
                      setEditingId(null);
                      router.refresh();
                    }}
                  />
                </div>
              ) : (
                <PlanRow key={p.id} p={p} tenantId={tenantId} onEdit={() => setEditingId(p.id)} />
              )
            )}
          </div>
        </div>
      )}

      <div>
        <div className="text-[.68rem] uppercase tracking-[.05em] text-muted mb-1">Built-in defaults</div>
        <div className="flex flex-col divide-y divide-line">
          {builtIn.map((p) => (
            <PlanRow key={p.id} p={p} tenantId={tenantId} />
          ))}
        </div>
      </div>
    </Card>
  );
}
