"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { ScopePicker } from "@/components/scope/ScopePicker";
import { ProviderPicker } from "@/components/providers/ProviderPicker";
import { addMedication, logMedicationDose, discontinueMedication } from "@/lib/actions/medications";
import type { MedicationRow } from "@/lib/medications";
import type { RosterItem } from "@/lib/roster";
import type { Provider } from "@/lib/providers";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

function AddMedicationForm({
  tenantId,
  roster,
  providers,
  onDone,
}: {
  tenantId: string;
  roster: RosterItem[];
  providers: Provider[];
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addMedication(tenantId, formData);
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
        <ScopePicker roster={roster} />
        <label className="flex flex-col gap-1.5">
          <span className={label}>Medication</span>
          <input name="name" required className={field} placeholder="Heartworm prevention (NexGard)" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Dosage (optional)</span>
            <input name="dosage" className={field} placeholder="1 tablet" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Repeats every (days)</span>
            <input type="number" name="frequency_days" min="1" required defaultValue="30" className={field} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Start date</span>
            <input type="date" name="start_date" className={field} defaultValue={new Date().toISOString().slice(0, 10)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>End date (optional — blank = ongoing)</span>
            <input type="date" name="end_date" className={field} />
          </label>
        </div>
        <ProviderPicker providers={providers} label="Prescribed by (optional)" />
        <label className="flex flex-col gap-1.5">
          <span className={label}>Notes (optional)</span>
          <input name="notes" className={field} />
        </label>

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition disabled:opacity-60"
          >
            {pending ? "Saving…" : "Add medication"}
          </button>
          <button type="button" onClick={onDone} className="text-xs text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

function MedicationActions({ tenantId, medicationId }: { tenantId: string; medicationId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 flex-none">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await logMedicationDose(tenantId, medicationId);
            router.refresh();
          })
        }
        className="text-xs text-muted hover:text-good border border-line rounded-md px-2 py-1 transition disabled:opacity-60"
      >
        {pending ? "…" : "Log dose"}
      </button>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (!confirm("Discontinue this medication?")) return;
            await discontinueMedication(tenantId, medicationId);
            router.refresh();
          })
        }
        className="text-xs text-muted hover:text-coral transition disabled:opacity-60"
      >
        Discontinue
      </button>
    </div>
  );
}

export function MedicationsPanel({
  tenantId,
  roster,
  vetProviders,
  medications,
}: {
  tenantId: string;
  roster: RosterItem[];
  vetProviders: Provider[];
  medications: MedicationRow[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {roster.length > 0 && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition"
          >
            <PlusIcon className="w-[.9em] h-[.9em]" />
            Add medication
          </button>
        )}
      </div>

      {showForm && (
        <AddMedicationForm tenantId={tenantId} roster={roster} providers={vetProviders} onDone={() => setShowForm(false)} />
      )}

      {medications.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">No ongoing medications tracked.</Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface-2">
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Who</th>
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Medication</th>
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Next due</th>
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line"></th>
              </tr>
            </thead>
            <tbody>
              {medications.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-none">
                  <td className="px-4 py-3 font-medium">{m.who}</td>
                  <td className="px-4 py-3">
                    {m.name}
                    {m.dosage && <span className="text-muted"> — {m.dosage}</span>}
                    {m.provider && <div className="text-xs text-muted mt-0.5">{m.provider}</div>}
                  </td>
                  <td className={`px-4 py-3 ${m.overdue ? "text-coral" : "text-muted"}`}>{m.nextDueLabel}</td>
                  <td className="px-4 py-3">
                    <MedicationActions tenantId={tenantId} medicationId={m.id} />
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
