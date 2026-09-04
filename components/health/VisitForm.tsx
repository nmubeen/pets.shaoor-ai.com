"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PetPicker } from "@/components/scope/PetPicker";
import { ProviderPicker } from "@/components/providers/ProviderPicker";
import { addVisit } from "@/lib/actions/health";
import type { RosterItem } from "@/lib/roster";
import type { Provider } from "@/lib/providers";
import type { ServiceType } from "@/lib/care-services";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

/** One multi-row "name + cost" list, shared by the Services and Vaccinations given sections. */
function RowList({
  title,
  addLabel,
  nameField,
  costField,
  namePlaceholder,
  datalistId,
  suggestions,
  minRows = 1,
}: {
  title: string;
  addLabel: string;
  nameField: string;
  costField: string;
  namePlaceholder: string;
  datalistId: string;
  suggestions: string[];
  /** How many blank rows to start with — Services defaults to 1 (most visits have at least one), Vaccinations to 0 (most don't). */
  minRows?: number;
}) {
  const [rows, setRows] = useState(() => Array.from({ length: minRows }, (_, i) => i));
  const [nextKey, setNextKey] = useState(minRows);

  return (
    <div className="flex flex-col gap-1.5">
      <span className={label}>{title}</span>
      <datalist id={datalistId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <div className="flex flex-col gap-2">
        {rows.map((key) => (
          <div key={key} className="flex gap-2 items-center">
            <input name={nameField} list={datalistId} className={`${field} flex-1`} placeholder={namePlaceholder} />
            <input
              type="number"
              name={costField}
              min="0"
              step="0.01"
              className={`${field} w-28 flex-none`}
              placeholder="Cost"
            />
            <button
              type="button"
              onClick={() => setRows((r) => r.filter((k) => k !== key))}
              className="text-xs text-muted hover:text-coral transition flex-none px-1"
              aria-label="Remove row"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setRows((r) => [...r, nextKey]);
          setNextKey((k) => k + 1);
        }}
        className="text-xs text-primary hover:underline self-start"
      >
        + {addLabel}
      </button>
    </div>
  );
}

export function VisitForm({
  tenantId,
  roster,
  providers,
  serviceTypes,
  dueVaccinationNames,
  onDone,
}: {
  tenantId: string;
  roster: RosterItem[];
  providers: Provider[];
  serviceTypes: ServiceType[];
  dueVaccinationNames: string[];
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addVisit(tenantId, formData);
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
        <PetPicker roster={roster} />

        <label className="flex flex-col gap-1.5">
          <span className={label}>Reason</span>
          <input name="reason" required className={field} placeholder="Wellness check" />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ProviderPicker providers={providers} label="Vet / hospital / groomer (optional)" />
          <label className="flex flex-col gap-1.5">
            <span className={label}>Consulting doctor (optional)</span>
            <input name="vet_name" className={field} placeholder="Dr. Mehta" />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Date</span>
            <input type="date" name="visit_date" className={field} defaultValue={new Date().toISOString().slice(0, 10)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Weight, kg (optional)</span>
            <input type="number" name="weight_kg" min="0" step="0.1" className={field} placeholder="4.2" />
          </label>
        </div>

        <RowList
          title="Services (optional — cost totals up automatically)"
          addLabel="Add service"
          nameField="service_name"
          costField="service_cost"
          namePlaceholder="Deworming"
          datalistId="service-suggestions"
          suggestions={serviceTypes.map((s) => s.name)}
          minRows={1}
        />

        <RowList
          title="Vaccinations given (optional)"
          addLabel="Add vaccine"
          nameField="vaccine_name"
          costField="vaccine_cost"
          namePlaceholder="DHPP booster"
          datalistId="vaccine-suggestions"
          suggestions={dueVaccinationNames}
          minRows={0}
        />

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
