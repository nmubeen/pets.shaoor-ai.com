"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { PetPicker } from "@/components/scope/PetPicker";
import { PetFilterSelect } from "@/components/health/PetFilterSelect";
import { ProviderPicker } from "@/components/providers/ProviderPicker";
import { addMedication, updateMedication, logMedicationDose, discontinueMedication, deleteMedication } from "@/lib/actions/medications";
import type { MedicationRow } from "@/lib/medications";
import type { RosterItem } from "@/lib/roster";
import type { Provider } from "@/lib/providers";
import type { PendingVisitEdit } from "@/components/health/HealthView";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

function MedicationForm({
  tenantId,
  roster,
  providers,
  onDone,
  editing,
}: {
  tenantId: string;
  roster: RosterItem[];
  providers: Provider[];
  onDone: () => void;
  editing?: MedicationRow;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = editing
        ? await updateMedication(tenantId, editing.id, formData)
        : await addMedication(tenantId, formData);
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
        <PetPicker roster={roster} defaultValue={editing?.petId} />
        <label className="flex flex-col gap-1.5">
          <span className={label}>Medication</span>
          <input name="name" required defaultValue={editing?.name} className={field} placeholder="Heartworm prevention (NexGard)" />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Dosage (optional)</span>
            <input name="dosage" defaultValue={editing?.dosage ?? ""} className={field} placeholder="1 tablet" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Repeats every (days)</span>
            <input
              type="number"
              name="frequency_days"
              min="1"
              required
              defaultValue={editing?.frequencyDays ?? 30}
              className={field}
            />
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Start date</span>
            <input
              type="date"
              name="start_date"
              className={field}
              defaultValue={editing?.startDate ?? new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>End date (optional — blank = ongoing)</span>
            <input type="date" name="end_date" className={field} defaultValue={editing?.endDate ?? ""} />
          </label>
        </div>
        <ProviderPicker providers={providers} label="Prescribed by (optional)" defaultValue={editing?.providerId} />
        <label className="flex flex-col gap-1.5">
          <span className={label}>Notes (optional)</span>
          <input name="notes" defaultValue={editing?.notes ?? ""} className={field} />
        </label>

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition disabled:opacity-60"
          >
            {pending ? "Saving…" : editing ? "Save changes" : "Add medication"}
          </button>
          <button type="button" onClick={onDone} className="text-xs text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

function MedicationActions({
  tenantId,
  medicationId,
  visitId,
  onEdit,
  onEditViaVisit,
}: {
  tenantId: string;
  medicationId: string;
  /** Set when this medication was prescribed as part of a visit — Edit opens that visit instead, and Delete (which would leave the visit's own record lying) is hidden. */
  visitId: string | null;
  onEdit: () => void;
  onEditViaVisit: (edit: PendingVisitEdit) => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 flex-none flex-wrap">
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
      {visitId ? (
        <button
          onClick={() => onEditViaVisit({ visitId, focusId: medicationId })}
          className="text-xs text-muted hover:text-ink border border-line rounded-md px-2 py-1 transition"
          title="Prescribed as part of a visit — opens that visit"
        >
          Edit (in visit)
        </button>
      ) : (
        <button onClick={onEdit} className="text-xs text-muted hover:text-ink border border-line rounded-md px-2 py-1 transition">
          Edit
        </button>
      )}
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
      {!visitId && (
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (!confirm("Delete this medication entirely? This removes it, not just its future doses.")) return;
              await deleteMedication(tenantId, medicationId);
              router.refresh();
            })
          }
          className="text-xs text-muted hover:text-coral transition disabled:opacity-60"
        >
          Delete
        </button>
      )}
    </div>
  );
}

export function MedicationsPanel({
  tenantId,
  canWrite,
  roster,
  vetProviders,
  medications,
  onEditViaVisit,
}: {
  tenantId: string;
  canWrite: boolean;
  roster: RosterItem[];
  vetProviders: Provider[];
  medications: MedicationRow[];
  onEditViaVisit: (edit: PendingVisitEdit) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingMed, setEditingMed] = useState<MedicationRow | null>(null);
  const [petFilter, setPetFilter] = useState("all");
  const hasPets = roster.some((r) => r.kind === "pet");
  const filtered = petFilter === "all" ? medications : medications.filter((m) => m.petId === petFilter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {canWrite && hasPets && (
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setEditingMed(null);
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition"
          >
            <PlusIcon className="w-[.9em] h-[.9em]" />
            Add medication
          </button>
        )}
      </div>

      <PetFilterSelect roster={roster} value={petFilter} onChange={setPetFilter} />

      {(showForm || editingMed) && (
        <MedicationForm
          tenantId={tenantId}
          roster={roster}
          providers={vetProviders}
          editing={editingMed ?? undefined}
          onDone={() => {
            setShowForm(false);
            setEditingMed(null);
          }}
        />
      )}

      {filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">No ongoing medications tracked.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface-2">
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Who</th>
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Medication</th>
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Next due</th>
                {canWrite && <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-none">
                  <td className="px-4 py-3 font-medium">{m.who}</td>
                  <td className="px-4 py-3">
                    {m.name}
                    {m.dosage && <span className="text-muted"> — {m.dosage}</span>}
                    {m.provider && <div className="text-xs text-muted mt-0.5">{m.provider}</div>}
                  </td>
                  <td className={`px-4 py-3 ${m.overdue ? "text-coral" : "text-muted"}`}>{m.nextDueLabel}</td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <MedicationActions
                        tenantId={tenantId}
                        medicationId={m.id}
                        visitId={m.visitId}
                        onEdit={() => {
                          setEditingMed(m);
                          setShowForm(false);
                        }}
                        onEditViaVisit={onEditViaVisit}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
