"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { ScopePicker } from "@/components/health/ScopePicker";
import { addVetVisit, addIllness, addVaccination, addGroomingVisit } from "@/lib/actions/health";
import type { RosterItem } from "@/lib/roster";

export type HealthTabKey = "visits" | "illnesses" | "vaccinations" | "grooming";

const ACTIONS = {
  visits: addVetVisit,
  illnesses: addIllness,
  vaccinations: addVaccination,
  grooming: addGroomingVisit,
} as const;

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

export function LogHealthForm({
  tab,
  tenantId,
  roster,
  onDone,
}: {
  tab: HealthTabKey;
  tenantId: string;
  roster: RosterItem[];
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await ACTIONS[tab](tenantId, formData);
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

        {tab === "visits" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Reason</span>
              <input name="reason" required className={field} placeholder="Wellness check" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Vet (optional)</span>
              <input name="vet_name" className={field} placeholder="Dr. Iyer" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={label}>Date</span>
                <input type="date" name="visit_date" className={field} defaultValue={new Date().toISOString().slice(0, 10)} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Cost (optional)</span>
                <input type="number" name="cost" min="0" step="0.01" className={field} placeholder="0" />
              </label>
            </div>
          </>
        )}

        {tab === "illnesses" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Description</span>
              <input name="reason" required className={field} placeholder="Ear infection" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={label}>Diagnosed</span>
                <input type="date" name="diagnosed_date" className={field} defaultValue={new Date().toISOString().slice(0, 10)} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Status</span>
                <select name="status" className={field} defaultValue="active">
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
              <input name="reason" required className={field} placeholder="2nd booster (FVRCP)" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={label}>Due / administered date</span>
                <input type="date" name="due_date" className={field} defaultValue={new Date().toISOString().slice(0, 10)} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Status</span>
                <select name="status" className={field} defaultValue="due">
                  <option value="due">Due</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="complete">Complete</option>
                </select>
              </label>
            </div>
          </>
        )}

        {tab === "grooming" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Service</span>
              <input name="service" required className={field} placeholder="Bath & trim" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={label}>Date</span>
                <input type="date" name="visit_date" className={field} defaultValue={new Date().toISOString().slice(0, 10)} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Cost (optional)</span>
                <input type="number" name="cost" min="0" step="0.01" className={field} placeholder="0" />
              </label>
            </div>
          </>
        )}

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
