"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { PetPicker } from "@/components/scope/PetPicker";
import { PetFilterSelect } from "@/components/health/PetFilterSelect";
import { formatTime, formatDate } from "@/lib/format";
import {
  addFeedingSchedule,
  updateFeedingSchedule,
  deleteFeedingSchedule,
  logFeeding,
  deleteFeedingLog,
} from "@/lib/actions/feeding";
import type { FeedingScheduleRow, FeedingLogRow } from "@/lib/feeding";
import type { RosterItem } from "@/lib/roster";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

/** Current wall-clock time (browser-local), HH:MM — what "Mark fed" logs by default, and what a fresh schedule's time input starts from. */
function nowTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function FeedingScheduleForm({
  tenantId,
  roster,
  onDone,
  editing,
}: {
  tenantId: string;
  roster: RosterItem[];
  onDone: () => void;
  editing?: FeedingScheduleRow;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = editing
        ? await updateFeedingSchedule(tenantId, editing.id, formData)
        : await addFeedingSchedule(tenantId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <Card className="p-5 bg-(image:--gradient-form-bg)">
      <form action={handleSubmit} className="flex flex-col gap-3">
        <PetPicker roster={roster} defaultValue={editing?.petId} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Meal</span>
            <input
              name="meal_name"
              required
              list="feeding-meal-names"
              defaultValue={editing?.mealName}
              className={field}
              placeholder="Breakfast"
            />
            <datalist id="feeding-meal-names">
              <option value="Breakfast" />
              <option value="Lunch" />
              <option value="Snack" />
              <option value="Dinner" />
            </datalist>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Scheduled time</span>
            <input
              type="text"
              name="scheduled_time"
              required
              pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]\s*[APap][Mm]$"
              title="Enter a time like 8:00 AM"
              placeholder="8:00 AM"
              defaultValue={editing ? formatTime(editing.scheduledTime) : ""}
              className={field}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={label}>Portion (optional)</span>
          <input name="portion" defaultValue={editing?.portion ?? ""} className={field} placeholder="2 scoops dry" />
        </label>

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-(image:--gradient-button-bg) text-white px-4 py-2.5 rounded-lg hover:brightness-110 transition disabled:opacity-60"
          >
            {pending ? "Saving…" : editing ? "Save changes" : "Add meal"}
          </button>
          <button type="button" onClick={onDone} className="text-xs text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

/** The "Today" cell — either a one-click "Mark fed" button, or (once logged) the time it was given with a way to fix the time or undo it. */
function TodayStatus({ tenantId, schedule }: { tenantId: string; schedule: FeedingScheduleRow }) {
  const [editingTime, setEditingTime] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function markFed(givenAt: string) {
    startTransition(async () => {
      await logFeeding(tenantId, schedule.id, givenAt);
      router.refresh();
      setEditingTime(false);
    });
  }

  if (!schedule.todayLog) {
    return (
      <button
        disabled={pending}
        onClick={() => markFed(nowTime())}
        className="text-xs text-muted hover:text-good border border-line rounded-md px-2 py-1 transition disabled:opacity-60"
      >
        {pending ? "…" : "Mark fed"}
      </button>
    );
  }

  if (editingTime) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const time = new FormData(e.currentTarget).get("time");
          if (typeof time === "string" && time) markFed(time);
        }}
        className="flex items-center gap-1.5"
      >
        <input
          type="time"
          name="time"
          required
          defaultValue={schedule.todayLog.givenAt.slice(0, 5)}
          className="bg-paper border border-line rounded-md px-2 py-1 text-xs outline-none focus:border-primary transition"
          onClick={(e) => e.currentTarget.showPicker?.()}
          autoFocus
        />
        <button type="submit" disabled={pending} className="text-xs text-good">
          Save
        </button>
        <button type="button" onClick={() => setEditingTime(false)} className="text-xs text-muted">
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-good font-medium">Fed at {formatTime(schedule.todayLog.givenAt)}</span>
      <button onClick={() => setEditingTime(true)} className="text-xs text-muted hover:text-ink">
        Edit
      </button>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await deleteFeedingLog(tenantId, schedule.todayLog!.id);
            router.refresh();
          })
        }
        className="text-xs text-muted hover:text-coral transition disabled:opacity-60"
      >
        Undo
      </button>
    </div>
  );
}

function ScheduleActions({
  tenantId,
  scheduleId,
  onEdit,
}: {
  tenantId: string;
  scheduleId: string;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 flex-none">
      <button onClick={onEdit} className="text-xs text-muted hover:text-ink border border-line rounded-md px-2 py-1 transition">
        Edit
      </button>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (!confirm("Delete this meal from the schedule? This also removes its feeding history.")) return;
            await deleteFeedingSchedule(tenantId, scheduleId);
            router.refresh();
          })
        }
        className="text-xs text-muted hover:text-coral transition disabled:opacity-60"
      >
        Delete
      </button>
    </div>
  );
}

function FeedingHistory({ history }: { history: FeedingLogRow[] }) {
  if (history.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted">Last 7 days</h2>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface-2">
              <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Date</th>
              <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Who</th>
              <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Meal</th>
              <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Given at</th>
            </tr>
          </thead>
          <tbody>
            {history.map((l) => (
              <tr key={l.id} className="border-b border-line last:border-none">
                <td className="px-4 py-3 text-muted">{formatDate(new Date(l.logDate + "T00:00:00"))}</td>
                <td className="px-4 py-3 font-medium">{l.who}</td>
                <td className="px-4 py-3">{l.mealName}</td>
                <td className="px-4 py-3 font-mono">{formatTime(l.givenAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function FeedingPanel({
  tenantId,
  roster,
  schedules,
  history,
}: {
  tenantId: string;
  roster: RosterItem[];
  schedules: FeedingScheduleRow[];
  history: FeedingLogRow[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FeedingScheduleRow | null>(null);
  const [petFilter, setPetFilter] = useState("all");
  const hasPets = roster.some((r) => r.kind === "pet");
  const filtered = petFilter === "all" ? schedules : schedules.filter((s) => s.petId === petFilter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1 text-(--color-primary-text)">Feeding</h1>
          <p className="text-sm text-muted">Meal schedule and a 7-day feeding log, per pet</p>
        </div>
        {hasPets && (
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setEditingSchedule(null);
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold bg-(image:--gradient-button-bg) text-white px-4 py-2.5 rounded-lg hover:brightness-110 transition"
          >
            <PlusIcon className="w-[.9em] h-[.9em]" />
            Add meal
          </button>
        )}
      </div>

      <PetFilterSelect roster={roster} value={petFilter} onChange={setPetFilter} />

      {(showForm || editingSchedule) && (
        <FeedingScheduleForm
          tenantId={tenantId}
          roster={roster}
          editing={editingSchedule ?? undefined}
          onDone={() => {
            setShowForm(false);
            setEditingSchedule(null);
          }}
        />
      )}

      {!hasPets ? (
        <Card className="p-6 text-center text-sm text-muted">Add a pet first — feeding is scheduled per pet.</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">No meals scheduled yet.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface-2">
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Who</th>
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Meal</th>
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Time</th>
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Portion</th>
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Today</th>
                <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-none">
                  <td className="px-4 py-3 font-medium">{s.who}</td>
                  <td className="px-4 py-3">{s.mealName}</td>
                  <td className="px-4 py-3 font-mono">{formatTime(s.scheduledTime)}</td>
                  <td className="px-4 py-3 text-muted">{s.portion ?? "—"}</td>
                  <td className="px-4 py-3">
                    <TodayStatus tenantId={tenantId} schedule={s} />
                  </td>
                  <td className="px-4 py-3">
                    <ScheduleActions
                      tenantId={tenantId}
                      scheduleId={s.id}
                      onEdit={() => {
                        setEditingSchedule(s);
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

      <FeedingHistory history={history} />
    </div>
  );
}
