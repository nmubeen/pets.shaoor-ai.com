"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { PetSummaryCards } from "@/components/pets/PetSummaryCards";
import { WeightChart } from "@/components/health/GrowthPanel";
import { SPECIES_LABEL } from "@/lib/species-labels";
import { SEX_LABEL, ageLabel } from "@/lib/pet-labels";
import type { PetVetSummary } from "@/lib/vet-view";

const sectionLabel = "text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold mb-2";

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 text-sm py-1 border-b border-line last:border-none">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
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
 * Read-only, mobile-first one-pager: a short narration for every pet,
 * then tap a card to see that pet's full basic-details + Visits/
 * Illnesses/Vaccinations/Medications/Growth summary below. Deliberately
 * a single-column stack throughout, not HealthView's multi-tab layout —
 * this is meant to be handed to (or opened by) someone on a phone, in
 * one scroll, not navigated tab by tab.
 */
export function VetView({ tenantName, summaries }: { tenantName: string; summaries: PetVetSummary[] }) {
  const [selectedId, setSelectedId] = useState(summaries[0]?.pet.id ?? "");
  const selected = summaries.find((s) => s.pet.id === selectedId) ?? summaries[0] ?? null;

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

      <Card className="p-4 flex flex-col gap-2.5">
        {summaries.map((s) => (
          <p key={s.pet.id} className="text-sm">
            {s.narration}
          </p>
        ))}
      </Card>

      <PetSummaryCards
        pets={summaries.map((s) => s.pet)}
        selectedId={selected?.pet.id}
        onSelect={setSelectedId}
      />

      {selected && (
        <div className="flex flex-col gap-4">
          <Section title={`${selected.pet.name} — Basic details`}>
            <div className="flex flex-col">
              {selected.pet.pet && (
                <>
                  <DetailRow label="Species" value={SPECIES_LABEL[selected.pet.pet.species]} />
                  <DetailRow label="Breed" value={selected.pet.pet.breed} />
                  <DetailRow label="Sex" value={SEX_LABEL[selected.pet.pet.sex]} />
                  <DetailRow label="Age" value={ageLabel(selected.pet.pet.birthDate)} />
                  <DetailRow label="Weight" value={selected.pet.pet.weightKg !== null ? `${selected.pet.pet.weightKg} kg` : null} />
                  <DetailRow label="Color / markings" value={selected.pet.pet.color} />
                  <DetailRow label="Microchip" value={selected.pet.pet.microchipId} />
                  <DetailRow label="Neutered / spayed" value={selected.pet.pet.neutered === null ? null : selected.pet.pet.neutered ? "Yes" : "No"} />
                  <DetailRow label="Notes" value={selected.pet.pet.notes} />
                </>
              )}
            </div>
          </Section>

          <Section title="Visits">
            {selected.visits.length === 0 ? (
              <p className="text-sm text-muted">No visits logged.</p>
            ) : (
              <div className="flex flex-col divide-y divide-line">
                {selected.visits.map((v) => (
                  <div key={v.id} className="py-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium">{v.reason}</span>
                      <span className="text-muted flex-none">{v.date}</span>
                    </div>
                    {(v.provider || v.doctor) && (
                      <div className="text-xs text-muted">
                        {[v.provider, v.doctor && `Dr. ${v.doctor}`].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Illnesses">
            {selected.illnesses.length === 0 ? (
              <p className="text-sm text-muted">No illnesses on record.</p>
            ) : (
              <div className="flex flex-col divide-y divide-line">
                {selected.illnesses.map((i) => (
                  <div key={i.id} className="py-2 text-sm flex justify-between gap-3">
                    <div>
                      <div className="font-medium">{i.reason}</div>
                      <div className="text-xs text-muted">{i.date}</div>
                    </div>
                    <span className="text-xs text-muted flex-none">{i.status}</span>
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
                  <div key={v.id} className="py-2 text-sm flex justify-between gap-3">
                    <div>
                      <div className="font-medium">{v.reason}</div>
                      <div className="text-xs text-muted">{v.date}{v.provider ? ` · ${v.provider}` : ""}</div>
                    </div>
                    <span className="text-xs text-muted flex-none">{v.status}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Medications">
            {selected.medications.length === 0 ? (
              <p className="text-sm text-muted">No medications on record.</p>
            ) : (
              <div className="flex flex-col divide-y divide-line">
                {selected.medications.map((m) => (
                  <div key={m.id} className="py-2 text-sm flex justify-between gap-3">
                    <div>
                      <div className="font-medium">
                        {m.name}
                        {m.dosage && <span className="text-muted"> — {m.dosage}</span>}
                      </div>
                      <div className="text-xs text-muted">Every {m.frequencyDays}d · next {m.nextDueLabel}</div>
                    </div>
                    <span className="text-xs text-muted flex-none capitalize">{m.status}</span>
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
