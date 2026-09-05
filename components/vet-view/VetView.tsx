"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { PetSummaryCards } from "@/components/pets/PetSummaryCards";
import { WeightChart } from "@/components/health/GrowthPanel";
import { WeightIcon, ShieldIcon, ClipboardIcon, StethoIcon, VialIcon, HeartIcon } from "@/components/icons";
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
 * Read-only, mobile-first one-pager: pet cards up top (tap one to select
 * it — the selected card gets a check badge + ring), an icon-led health
 * summary for just that pet, then Visits/Illnesses/Vaccinations/Growth
 * details below. Deliberately a
 * single-column stack throughout, not HealthView's multi-tab layout —
 * this is meant to be handed to (or opened by) someone on a phone, in
 * one scroll, not navigated tab by tab.
 */
export function VetView({ tenantName, summaries }: { tenantName: string; summaries: PetVetSummary[] }) {
  const [selectedId, setSelectedId] = useState(summaries[0]?.pet.id ?? "");
  const [showAllVisits, setShowAllVisits] = useState(false);
  const selected = summaries.find((s) => s.pet.id === selectedId) ?? summaries[0] ?? null;

  function handleSelectPet(id: string) {
    setSelectedId(id);
    setShowAllVisits(false);
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

      <PetSummaryCards
        pets={summaries.map((s) => s.pet)}
        selectedId={selected?.pet.id}
        onSelect={handleSelectPet}
        showSubtitle={false}
      />

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
