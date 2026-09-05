"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@/components/icons";
import { addCareTask, completeCareTask, deleteCareTask, logHabitatCare } from "@/lib/actions/tasks";
import { HABITAT_CARE_PRESETS } from "@/lib/habitat-care-shared";
import type { HabitatCare, HabitatCareRow } from "@/lib/habitat-care-shared";

const field = "bg-paper border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

/** One-click "log it now" — see lib/actions/tasks.ts's logHabitatCare for why this needs no confirmation dialog or extra step. */
function PresetButton({ tenantId, habitatId, title }: { tenantId: string; habitatId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await logHabitatCare(tenantId, habitatId, title);
          router.refresh();
        })
      }
      className="text-xs font-medium bg-surface-2 hover:bg-line text-ink px-2.5 py-1.5 rounded-md transition disabled:opacity-60"
    >
      {pending ? "…" : title}
    </button>
  );
}

function AddCustomForm({ tenantId, habitatId, onDone }: { tenantId: string; habitatId: string; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addCareTask(tenantId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-2 border-t border-line pt-2.5 mt-1">
      {/* Scope is implicit — this form only ever exists on this one habitat's own card — so no ScopePicker is needed here, unlike the dashboard's general Care tasks widget. */}
      <input type="hidden" name="scope" value={`habitat:${habitatId}`} />
      <label className="flex flex-col gap-1">
        <span className={label}>Task</span>
        <input name="title" required className={field} placeholder="Trim plants" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className={label}>Due date</span>
          <input type="date" name="due_date" className={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Repeats every (days)</span>
          <input type="number" name="repeat_interval_days" min="1" className={field} placeholder="Optional" />
        </label>
      </div>
      {error && <p className="text-xs text-coral">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="text-xs font-semibold bg-accent text-accent-ink px-3 py-1.5 rounded-lg hover:brightness-95 transition disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add"}
        </button>
        <button type="button" onClick={onDone} className="text-xs text-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}

function OpenTaskRow({ tenantId, task, canWrite }: { tenantId: string; task: HabitatCareRow; canWrite: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-xs">
      <div className="min-w-0">
        <div className="font-medium truncate">{task.title}</div>
        <div className={task.overdue ? "text-coral" : "text-muted"}>{task.dueLabel}</div>
      </div>
      {canWrite && (
        <div className="flex items-center gap-1.5 flex-none">
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await completeCareTask(tenantId, task.id);
                router.refresh();
              })
            }
            className="text-xs text-muted hover:text-good border border-line rounded-md px-2 py-1 transition disabled:opacity-60"
          >
            {pending ? "…" : "Log now"}
          </button>
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (!confirm(`Remove "${task.title}"?`)) return;
                await deleteCareTask(tenantId, task.id);
                router.refresh();
              })
            }
            className="text-muted hover:text-coral transition disabled:opacity-60 px-0.5"
            aria-label="Remove"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A habitat's own Care panel — feed, cleaning, water change, or anything
 * else worth tracking for it, built on the existing care_tasks table
 * (see lib/habitat-care.ts). Presets one-click "log it now"; a custom
 * form covers anything else, with an explicit due date/repeat interval.
 */
export function HabitatCarePanel({
  tenantId,
  habitatId,
  canWrite,
  care,
}: {
  tenantId: string;
  habitatId: string;
  canWrite: boolean;
  care: HabitatCare;
}) {
  const [showForm, setShowForm] = useState(false);

  if (!canWrite && care.open.length === 0 && care.history.length === 0) return null;

  return (
    <div className="border-t border-line pt-2.5 mt-1 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold">Care</span>
        {canWrite && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <PlusIcon className="w-[.85em] h-[.85em]" />
            Custom
          </button>
        )}
      </div>

      {canWrite && (
        <div className="flex gap-1.5 flex-wrap">
          {HABITAT_CARE_PRESETS.map((p) => (
            <PresetButton key={p.title} tenantId={tenantId} habitatId={habitatId} title={p.title} />
          ))}
        </div>
      )}

      {showForm && <AddCustomForm tenantId={tenantId} habitatId={habitatId} onDone={() => setShowForm(false)} />}

      {care.open.length > 0 && (
        <div className="flex flex-col divide-y divide-line">
          {care.open.map((t) => (
            <OpenTaskRow key={t.id} tenantId={tenantId} task={t} canWrite={canWrite} />
          ))}
        </div>
      )}

      {care.history.length > 0 && (
        <div className="text-[.7rem] text-muted flex flex-col gap-0.5 mt-1">
          {care.history.map((t) => (
            <div key={t.id} className="flex justify-between gap-2">
              <span className="truncate">{t.title}</span>
              <span className="flex-none">{t.completedDate}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
