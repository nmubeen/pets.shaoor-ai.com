"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PetPicker } from "@/components/scope/PetPicker";
import { ProviderPicker } from "@/components/providers/ProviderPicker";
import { addIllness, addVaccination, updateIllness, updateVaccination } from "@/lib/actions/health";
import type { RosterItem } from "@/lib/roster";
import type { Provider } from "@/lib/providers";
import type { HealthRow } from "@/lib/health";

/** Visits get their own dedicated form (components/health/VisitForm.tsx) — richer than these two, which stay simple single-event logs. */
export type HealthTabKey = "illnesses" | "vaccinations";

const ADD_ACTIONS = {
  illnesses: addIllness,
  vaccinations: addVaccination,
} as const;

const UPDATE_ACTIONS = {
  illnesses: updateIllness,
  vaccinations: updateVaccination,
} as const;

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

export function LogHealthForm({
  tab,
  tenantId,
  roster,
  providers,
  onDone,
  editing,
}: {
  tab: HealthTabKey;
  tenantId: string;
  roster: RosterItem[];
  /** Vet providers — offered as this vaccination's clinic when logged directly (not via a visit, which already picks its own provider). Unused for illnesses. */
  providers: Provider[];
  onDone: () => void;
  /** Present when editing an existing row instead of logging a new one. */
  editing?: HealthRow;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = editing
        ? await UPDATE_ACTIONS[tab](tenantId, editing.id, formData)
        : await ADD_ACTIONS[tab](tenantId, formData);
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

        {tab === "illnesses" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Description</span>
              <input name="reason" required defaultValue={editing?.reason} className={field} placeholder="Ear infection" />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={label}>Diagnosed</span>
                <input
                  type="date"
                  name="diagnosed_date"
                  className={field}
                  defaultValue={editing?.dateIso ?? new Date().toISOString().slice(0, 10)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Status</span>
                <select name="status" className={field} defaultValue={editing?.statusRaw ?? "active"}>
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>
            </div>
          </>
        )}

        {tab === "vaccinations" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Vaccine</span>
              <input name="reason" required defaultValue={editing?.reason} className={field} placeholder="2nd booster (FVRCP)" />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={label}>Due / administered date</span>
                <input
                  type="date"
                  name="due_date"
                  className={field}
                  defaultValue={editing?.dueDateIso ?? new Date().toISOString().slice(0, 10)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Status</span>
                <select name="status" className={field} defaultValue={editing?.statusRaw ?? "due"}>
                  <option value="due">Due</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="complete">Complete</option>
                </select>
              </label>
            </div>
            <ProviderPicker providers={providers} label="Clinic (optional)" defaultValue={editing?.providerId} />
          </>
        )}

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
