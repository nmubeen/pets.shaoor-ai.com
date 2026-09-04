"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { ScopePicker } from "@/components/scope/ScopePicker";
import { addCareTask, completeCareTask } from "@/lib/actions/tasks";
import type { CareTaskRow } from "@/lib/tasks";
import type { RosterItem } from "@/lib/roster";

function CompleteButton({ tenantId, taskId }: { tenantId: string; taskId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => {
        await completeCareTask(tenantId, taskId);
        router.refresh();
      })}
      className="text-xs text-muted hover:text-good border border-line rounded-md px-2 py-1 transition disabled:opacity-60"
    >
      {pending ? "…" : "Done"}
    </button>
  );
}

function AddTaskForm({ tenantId, roster, onDone }: { tenantId: string; roster: RosterItem[]; onDone: () => void }) {
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

  const field = "bg-paper border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition";
  const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

  return (
    <form action={handleSubmit} className="flex flex-col gap-2.5 border-t border-line pt-3 mt-1">
      <label className="flex flex-col gap-1">
        <span className={label}>Task</span>
        <input name="title" required className={field} placeholder="Water change" />
      </label>
      <ScopePicker roster={roster} allowHousehold />
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className={label}>Due date</span>
          <input type="date" name="due_date" className={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Repeats every (days)</span>
          <input type="number" name="repeat_interval_days" min="1" className={field} placeholder="e.g. 7" />
        </label>
      </div>
      {error && <p className="text-xs text-coral">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="text-sm font-semibold bg-accent text-accent-ink px-3.5 py-2 rounded-lg hover:brightness-95 transition disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add task"}
        </button>
        <button type="button" onClick={onDone} className="text-xs text-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function TasksCard({
  tenantId,
  roster,
  tasks,
}: {
  tenantId: string;
  roster: RosterItem[];
  tasks: CareTaskRow[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-sm">Care tasks</div>
        {roster.length > 0 && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <PlusIcon className="w-[.9em] h-[.9em]" />
            Add task
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted">Nothing due — add a recurring or one-off task.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line">
          {tasks.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2.5 text-sm gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{t.title}</div>
                <div className="text-xs text-muted truncate">{t.who}</div>
              </div>
              <div className="flex items-center gap-2 flex-none">
                <span className={`text-xs ${t.overdue ? "text-coral" : "text-muted"}`}>{t.dueLabel}</span>
                <CompleteButton tenantId={tenantId} taskId={t.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <AddTaskForm tenantId={tenantId} roster={roster} onDone={() => setShowForm(false)} />}
    </Card>
  );
}
