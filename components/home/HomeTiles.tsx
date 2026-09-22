"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui";
import { ScissorsIcon, DropIcon, BowlIcon } from "@/components/icons";
import { markVaccinationGiven } from "@/lib/actions/health";
import { logFeeding } from "@/lib/actions/feeding";
import { formatTime } from "@/lib/format";
import type { HealthRow } from "@/lib/health";
import type { FeedingScheduleRow } from "@/lib/feeding";

export type DueServiceItem = { id: string; petId: string; who: string; label: string; date: string; dateIso: string; overdue: boolean };

function TileHeader({ icon: Icon, title }: { icon: typeof ScissorsIcon; title: string }) {
  return (
    <div className="flex items-center gap-2 font-semibold text-sm mb-4">
      <Icon className="text-(--color-primary-text)" />
      {title}
    </div>
  );
}

function QuickActionButton({ onClick, label, pendingLabel = "…" }: { onClick: () => Promise<unknown>; label: string; pendingLabel?: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await onClick();
          router.refresh();
        })
      }
      className="text-xs text-muted hover:text-good border border-line rounded-md px-2 py-1 transition disabled:opacity-60 flex-none"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Every pet's next-due recurring service (grooming, deworming, ...),
 * across every pet — same data as each pet card's own summary
 * (lib/pet-links.ts's getPetHealthSummaries, shown via PetHealthLinks on
 * /app/pets), just flattened and sorted soonest-first instead of grouped
 * per card. No quick-complete action: a service is only "done" by
 * logging a new visit that records it (same as the pet card's own link),
 * there's no separate row to mark complete.
 */
export function ServicesTile({ services }: { services: DueServiceItem[] }) {
  return (
    <Card className="p-5">
      <TileHeader icon={ScissorsIcon} title="Services" />
      {services.length === 0 ? (
        <p className="text-sm text-muted">Nothing due.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line">
          {services.map((s) => (
            <Link
              key={s.id}
              href={`/app/health?tab=visits&pet=${s.petId}`}
              className="flex items-center justify-between py-2.5 text-sm gap-3 hover:opacity-80 transition"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{s.label}</div>
                <div className="text-xs text-muted truncate">{s.who}</div>
              </div>
              <span className={`text-xs flex-none ${s.overdue ? "text-coral" : "text-muted"}`}>{s.date}</span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Vaccinations that are due or scheduled (not yet complete) and have a due date, soonest first. */
export function VaccinationsTile({ tenantId, vaccinations }: { tenantId: string; vaccinations: HealthRow[] }) {
  return (
    <Card className="p-5">
      <TileHeader icon={DropIcon} title="Vaccinations" />
      {vaccinations.length === 0 ? (
        <p className="text-sm text-muted">Nothing due.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line">
          {vaccinations.map((v) => (
            <div key={v.id} className="flex items-center justify-between py-2.5 text-sm gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{v.reason}</div>
                <div className="text-xs text-muted truncate">{v.who}</div>
              </div>
              <div className="flex items-center gap-2 flex-none">
                <span className="text-xs text-muted">{v.date}</span>
                <QuickActionButton onClick={() => markVaccinationGiven(tenantId, v.id)} label="Given" />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function nowTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

/** A row in the Feeding tile — one or more of `upcoming`'s schedule rows collapsed into one, when they share a meal name, time, and portion (see CombinedFeeding). */
type CombinedFeeding = { key: string; scheduleIds: string[]; who: string; mealName: string; scheduledTime: string; portion: string | null };

/**
 * Collapses schedule rows that share a meal name, time, and portion into
 * one row listing every pet it's for — e.g. Milo and Simba both getting
 * "Breakfast, 8:00 AM, 2 scoops dry" shows once as "Milo, Simba" rather
 * than as two near-identical rows. Rows are already in scheduled-time
 * order (see getFeedingSchedules), which this preserves — each new group
 * is appended the first time its key is seen.
 */
function combineByMealTimeAndPortion(upcoming: FeedingScheduleRow[]): CombinedFeeding[] {
  const groups = new Map<string, CombinedFeeding>();
  for (const s of upcoming) {
    const key = `${s.mealName}|${s.scheduledTime}|${s.portion ?? ""}`;
    const existing = groups.get(key);
    if (existing) {
      existing.who += `, ${s.who}`;
      existing.scheduleIds.push(s.id);
    } else {
      groups.set(key, { key, scheduleIds: [s.id], who: s.who, mealName: s.mealName, scheduledTime: s.scheduledTime, portion: s.portion });
    }
  }
  return [...groups.values()];
}

/** Each pet's next meal that hasn't been logged as fed yet, in schedule order — combined across pets that share the same meal/time/portion. */
export function FeedingTile({ tenantId, upcoming }: { tenantId: string; upcoming: FeedingScheduleRow[] }) {
  const combined = combineByMealTimeAndPortion(upcoming);

  return (
    <Card className="p-5">
      <TileHeader icon={BowlIcon} title="Feeding" />
      {combined.length === 0 ? (
        <p className="text-sm text-muted">Nothing left to feed today.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line">
          {combined.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-2.5 text-sm gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {s.mealName} <span className="text-muted font-normal">— {s.who}</span>
                </div>
                {s.portion && <div className="text-xs text-muted truncate">{s.portion}</div>}
              </div>
              <div className="flex items-center gap-2 flex-none">
                <span className="text-xs text-muted font-mono">{formatTime(s.scheduledTime)}</span>
                <QuickActionButton
                  onClick={() => {
                    const givenAt = nowTime();
                    return Promise.all(s.scheduleIds.map((id) => logFeeding(tenantId, id, givenAt)));
                  }}
                  label="Fed"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
