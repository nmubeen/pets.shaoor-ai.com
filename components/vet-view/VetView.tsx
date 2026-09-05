"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui";
import { WeightChart } from "@/components/health/GrowthPanel";
import { WeightIcon, ShieldIcon, ClipboardIcon, StethoIcon, VialIcon, HeartIcon, BackIcon } from "@/components/icons";
import { SPECIES_LABEL } from "@/lib/species-labels";
import { SEX_LABEL, sterilizationLabel } from "@/lib/pet-labels";
import type { PetVetSummary, VetSummaryItem } from "@/lib/vet-view";

const sectionLabel = "text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold mb-2";
const summaryIcons: Record<VetSummaryItem["kind"], typeof WeightIcon> = {
  visits: StethoIcon,
  vaccinations: ShieldIcon,
  illnesses: HeartIcon,
  medications: VialIcon,
  weight: WeightIcon,
  records: ClipboardIcon,
};

function IconBullet({ icon: Icon, children }: { icon: typeof WeightIcon; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className="w-[.9em] h-[.9em] text-muted flex-none mt-0.5" />
      <span>{children}</span>
    </li>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: typeof WeightIcon; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className={`${sectionLabel} flex items-center gap-1.5`}>
        {Icon && <Icon className="w-[1em] h-[1em]" />}
        <span>{title}</span>
      </div>
      {children}
    </Card>
  );
}

/**
 * Read-only, mobile-first one-pager: a one-pet-at-a-time carousel up top
 * (circular photo, prev/next + dots + swipe + arrow keys — same
 * hand-rolled carousel pattern as the Pet Passport, no library), an
 * icon-led health summary for just that pet, then Visits/Illnesses/
 * Vaccinations/Growth details below. Deliberately a single-column stack
 * throughout, not HealthView's multi-tab layout — this is meant to be
 * handed to (or opened by) someone on a phone, in one scroll, not
 * navigated tab by tab.
 */
export function VetView({ tenantName, summaries }: { tenantName: string; summaries: PetVetSummary[] }) {
  const [index, setIndex] = useState(0);
  const [showAllVisits, setShowAllVisits] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const total = summaries.length;
  const selected = summaries[index] ?? null;

  function goTo(i: number) {
    setIndex(Math.max(0, Math.min(total - 1, i)));
    setShowAllVisits(false);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goTo(index - 1);
      if (e.key === "ArrowRight") goTo(index + 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 40) goTo(index - 1);
    else if (dx < -40) goTo(index + 1);
    touchStartX.current = null;
  }

  const points = selected?.weightHistory?.points ?? [];
  const lastWeight = points.length > 0 ? points[points.length - 1] : null;

  const VISIT_PREVIEW_COUNT = 3;
  const visits = selected?.visits ?? [];
  const visitsToShow = showAllVisits ? visits : visits.slice(0, VISIT_PREVIEW_COUNT);

  if (summaries.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl">Vet View</h1>
        <Card className="p-6 text-center text-sm text-muted">No pets yet.</Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto">
      <div>
        <h1 className="text-2xl mb-1">Vet View</h1>
        <p className="text-sm text-muted">{tenantName} · read-only summary</p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="relative flex items-center justify-center gap-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="w-8 h-8 rounded-full bg-surface border border-line shadow flex items-center justify-center disabled:opacity-30 transition flex-none"
            aria-label="Previous pet"
          >
            <BackIcon className="w-4 h-4" />
          </button>

          <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-line bg-surface-2 flex-none select-none">
            {selected?.pet.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.pet.photoUrl} alt={selected.pet.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ background: selected?.pet.color }}
              >
                {selected?.pet.initials}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index === total - 1}
            className="w-8 h-8 rounded-full bg-surface border border-line shadow flex items-center justify-center disabled:opacity-30 transition flex-none"
            aria-label="Next pet"
          >
            <BackIcon className="w-4 h-4 rotate-180" />
          </button>
        </div>

        {total > 1 && (
          <div className="flex items-center gap-1.5">
            {summaries.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition ${i === index ? "w-4 bg-primary" : "w-1.5 bg-line"}`}
                aria-label={`Go to pet ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {selected && selected.pet.pet && (
        <div>
          <h2 className="text-xl font-semibold">{selected.pet.name}</h2>
          <p className="text-sm font-bold text-muted">
            {[
              [
                selected.ageLabel,
                SEX_LABEL[selected.pet.pet.sex],
                `${SPECIES_LABEL[selected.pet.pet.species]} (${selected.pet.pet.breed})`,
              ]
                .filter(Boolean)
                .join(" "),
              sterilizationLabel(selected.pet.pet.sex, selected.pet.pet.neutered),
              lastWeight ? `${lastWeight.weightKg} kg as on ${lastWeight.date}` : null,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      )}

      {selected && (
        <Card className="p-4">
          <div className={sectionLabel}>Summary</div>
          <ul className="flex flex-col gap-2">
            {selected.summaryItems.map((item) => (
              <IconBullet key={item.kind} icon={summaryIcons[item.kind]}>
                {item.text}
              </IconBullet>
            ))}
          </ul>
        </Card>
      )}

      {selected && (
        <div className="flex flex-col gap-4">
          <Section title="Vaccinations" icon={ShieldIcon}>
            {selected.vaccinations.length === 0 ? (
              <p className="text-sm text-muted">No vaccinations on record.</p>
            ) : (
              <div className="flex flex-col divide-y divide-line">
                {selected.vaccinations.map((v) => (
                  <div key={v.id} className="py-2 text-sm">
                    <span className="font-semibold">{v.reason}</span> - {v.date}
                    {v.provider ? ` (${v.provider})` : ""}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Illnesses" icon={HeartIcon}>
            {selected.illnesses.length === 0 ? (
              <p className="text-sm text-muted">No illnesses on record.</p>
            ) : (
              <div className="flex flex-col divide-y divide-line">
                {selected.illnesses.map((i) => (
                  <div key={i.id} className="py-2 text-sm">
                    {i.date} — {i.reason}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Visits" icon={StethoIcon}>
            {visits.length === 0 ? (
              <p className="text-sm text-muted">No visits logged.</p>
            ) : (
              <>
                <div className="flex flex-col divide-y divide-line">
                  {visitsToShow.map((v) => {
                    // Consultation is the default catch-all service every
                    // visit tends to carry — listing it alongside actual
                    // services (Deworming, Grooming, ...) just adds noise
                    // to a summary meant to be scanned quickly.
                    const services = v.services.filter((s) => s.name.trim().toLowerCase() !== "consultation");
                    const details = [
                      services.length > 0 ? `Services: ${services.map((s) => s.name).join(", ")}` : null,
                      v.vaccinations.length > 0
                        ? `Vaccinations: ${v.vaccinations.map((x) => x.name).join(", ")}`
                        : null,
                      v.illnesses.length > 0 ? `Treatment for: ${v.illnesses.map((x) => x.name).join(", ")}` : null,
                    ].filter((detail): detail is string => detail !== null);
                    return (
                      <div key={v.id} className="py-2.5 text-sm">
                        <div>
                          <span className="font-semibold">{v.date}</span>
                          {v.provider && ` - ${v.provider}`}
                          {v.doctor && ` (Dr. ${v.doctor})`}
                        </div>
                        {details.length > 0 && (
                          <div className="text-xs mt-1">{details.join(" | ")}</div>
                        )}
                        {v.notes && (
                          <div className="text-xs mt-1">
                            <span className="font-semibold">Comments:</span> {v.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {!showAllVisits && visits.length > VISIT_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setShowAllVisits(true)}
                    className="text-xs text-primary hover:underline mt-2"
                  >
                    View all {visits.length} visits
                  </button>
                )}
              </>
            )}
          </Section>

          <Section title="Growth" icon={WeightIcon}>
            {!selected.weightHistory || selected.weightHistory.points.length === 0 ? (
              <p className="text-sm text-muted">No weight logged yet.</p>
            ) : (
              <WeightChart points={selected.weightHistory.points} />
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
