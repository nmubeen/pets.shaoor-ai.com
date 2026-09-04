"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { VisitForm } from "@/components/health/VisitForm";
import type { VisitRow } from "@/lib/health";
import type { RosterItem } from "@/lib/roster";
import type { Provider } from "@/lib/providers";
import type { ServiceType } from "@/lib/care-services";

function LineItems({ label, items }: { label: string; items: { name: string; cost: string | null }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="text-xs text-muted mt-1.5">
      <span className="uppercase tracking-[.05em] text-[.62rem]">{label}</span>
      <ul className="mt-0.5 flex flex-col gap-0.5">
        {items.map((it, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span>{it.name}</span>
            {it.cost && <span className="font-mono">{it.cost}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VisitsPanel({
  tenantId,
  roster,
  providers,
  serviceTypes,
  dueVaccinationNames,
  visits,
}: {
  tenantId: string;
  roster: RosterItem[];
  providers: Provider[];
  serviceTypes: ServiceType[];
  dueVaccinationNames: string[];
  visits: VisitRow[];
}) {
  const [showForm, setShowForm] = useState(false);
  const pets = roster.filter((r) => r.kind === "pet");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {pets.length > 0 && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition"
          >
            <PlusIcon className="w-[.9em] h-[.9em]" />
            Log a visit
          </button>
        )}
      </div>

      {showForm && (
        <VisitForm
          tenantId={tenantId}
          roster={roster}
          providers={providers}
          serviceTypes={serviceTypes}
          dueVaccinationNames={dueVaccinationNames}
          onDone={() => setShowForm(false)}
        />
      )}

      {pets.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">Add a pet first — visits are logged per pet.</Card>
      ) : visits.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">Nothing logged here yet.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visits.map((v) => (
            <Card key={v.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{v.reason}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {v.who} · {v.date}
                    {(v.provider || v.doctor) && (
                      <> · {[v.provider, v.doctor && `Dr. ${v.doctor}`].filter(Boolean).join(" · ")}</>
                    )}
                    {v.weightKg !== null && <> · {v.weightKg} kg</>}
                  </div>
                </div>
                {v.cost && <span className="font-mono text-sm flex-none">{v.cost}</span>}
              </div>
              <LineItems label="Services" items={v.services} />
              <LineItems label="Vaccinations given" items={v.vaccinations} />
              {v.notes && <div className="text-xs text-muted mt-2">{v.notes}</div>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
