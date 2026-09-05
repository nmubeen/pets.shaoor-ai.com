"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { PetSummaryCards } from "@/components/pets/PetSummaryCards";
import { WeightChart } from "@/components/health/GrowthPanel";
import { WeightIcon, ChipIcon, ShieldIcon, ClipboardIcon } from "@/components/icons";
import { SPECIES_LABEL } from "@/lib/species-labels";
import { SEX_LABEL, ageLabel } from "@/lib/pet-labels";
import type { PetVetSummary } from "@/lib/vet-view";

const sectionLabel = "text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold mb-2";

function IconBullet({ icon: Icon, children }: { icon: typeof WeightIcon; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className="w-[.9em] h-[.9em] text-muted flex-none mt-0.5" />
      <span>{children}</span>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className={sectionLabel}>{title}</div>
      {children}
    </Card>
  );
}

/**
 * Read-only, mobile-first one-pager: pet cards up top (tap one to select
 * it — the selected card gets a check badge + ring), a narration for
 * just that pet, then its full basic-details + Visits/Illnesses/
 * Vaccinations/Medications/Growth summary below. Deliberately a
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

  // Basic details' Weight row shows the weight tracker's latest reading
  // (visit weigh-ins), not pets.weight_kg — that field is a separate,
  // manually-set "current weight" snapshot that's never auto-synced from
  // visit history (see lib/growth.ts), so it can silently go stale.
  const points = selected?.weightHistory?.points ?? [];
  const lastWeight = points.length > 0 ? points[points.length - 1] : null;
  const petDetails = selected?.pet.pet;
  const hasBasicDetails = Boolean(
    lastWeight || petDetails?.microchipId || (petDetails && petDetails.neutered !== null) || petDetails?.notes
  );

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
      />

      {selected && selected.pet.pet && (
        <div>
          <h2 className="text-xl font-semibold">{selected.pet.name}</h2>
          <p className="text-sm text-muted">
            {[
              ageLabel(selected.pet.pet.birthDate),
              SEX_LABEL[selected.pet.pet.sex],
              `${SPECIES_LABEL[selected.pet.pet.species]} (${selected.pet.pet.breed})`,
            ]
              .filter(Boolean)
              .join(" ")}
          </p>
        </div>
      )}

      {selected && (
        <Card className="p-4">
          <div className={sectionLabel}>Summary</div>
          <p className="text-sm">{selected.narration}</p>
        </Card>
      )}

      {selected && (
        <div className="flex flex-col gap-4">
          <Section title="Basic details">
            {selected.pet.pet && (
              <>
                {hasBasicDetails ? (
                  <ul className="flex flex-col gap-2">
                    {lastWeight && (
                      <IconBullet icon={WeightIcon}>
                        {lastWeight.weightKg} kg (as on {lastWeight.date})
                      </IconBullet>
                    )}
                    {selected.pet.pet.microchipId && (
                      <IconBullet icon={ChipIcon}>Microchip {selected.pet.pet.microchipId}</IconBullet>
                    )}
                    {selected.pet.pet.neutered !== null && (
                      <IconBullet icon={ShieldIcon}>
                        {selected.pet.pet.neutered ? "Neutered / spayed" : "Not neutered / spayed"}
                      </IconBullet>
                    )}
                    {selected.pet.pet.notes && <IconBullet icon={ClipboardIcon}>{selected.pet.pet.notes}</IconBullet>}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">No additional details.</p>
                )}
              </>
            )}
          </Section>

          <Section title="Visits">
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
                    return (
                      <div key={v.id} className="py-2.5 text-sm">
                        <div className="font-semibold">{v.date}</div>
                        {v.provider && <div className="text-xs text-muted mt-0.5">{v.provider}</div>}
                        {v.doctor && <div className="text-xs text-muted">Dr. {v.doctor}</div>}
                        {services.length > 0 && (
                          <div className="text-xs mt-1">
                            <span className="text-muted">Services: </span>
                            {services.map((s) => s.name).join(", ")}
                          </div>
                        )}
                        {v.vaccinations.length > 0 && (
                          <div className="text-xs mt-1">
                            <span className="text-muted">Vaccinations: </span>
                            {v.vaccinations.map((x) => x.name).join(", ")}
                          </div>
                        )}
                        {v.illnesses.length > 0 && (
                          <div className="text-xs mt-1">
                            <span className="text-muted">Illnesses: </span>
                            {v.illnesses.map((x) => x.name).join(", ")}
                          </div>
                        )}
                        {v.medications.length > 0 && (
                          <div className="text-xs mt-1">
                            <span className="text-muted">Medications: </span>
                            {v.medications.map((x) => x.name).join(", ")}
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

          <Section title="Illnesses">
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

          <Section title="Vaccinations">
            {selected.vaccinations.length === 0 ? (
              <p className="text-sm text-muted">No vaccinations on record.</p>
            ) : (
              <div className="flex flex-col divide-y divide-line">
                {selected.vaccinations.map((v) => (
                  <div key={v.id} className="py-2 text-sm">
                    <div className="font-medium">{v.reason}</div>
                    <div className="text-xs text-muted">{v.date}{v.provider ? ` · ${v.provider}` : ""}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Growth">
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
