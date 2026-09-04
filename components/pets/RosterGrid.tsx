"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { AdoptionToggle } from "@/components/pets/AdoptionToggle";
import { AddRosterForm } from "@/components/roster/AddRosterForm";
import type { RosterItem } from "@/lib/roster";

export function RosterGrid({
  tenantId,
  roster,
  isOrg,
}: {
  tenantId: string;
  roster: RosterItem[];
  isOrg: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {roster.map((r) => {
        if (editingId === r.id) {
          return (
            <div key={r.id} className="sm:col-span-2 lg:col-span-3">
              <AddRosterForm
                tenantId={tenantId}
                mode="edit"
                initial={r}
                onDone={() => {
                  setEditingId(null);
                  router.refresh();
                }}
              />
            </div>
          );
        }

        return (
          <Card key={r.id} className="p-0 overflow-hidden flex min-h-[132px]">
            <div className="w-28 flex-none">
              {r.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photoUrl} alt={r.name} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-xl font-bold text-white"
                  style={{ background: r.color }}
                >
                  {r.initials}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-base truncate">{r.name}</div>
                <button
                  onClick={() => setEditingId(r.id)}
                  className="text-xs text-muted hover:text-ink transition flex-none"
                >
                  Edit
                </button>
              </div>
              <div className="text-xs text-muted">{r.subtitle}</div>
              {r.pet?.microchipId && (
                <div className="text-[.68rem] text-muted font-mono">Chip: {r.pet.microchipId}</div>
              )}
              {r.pet?.notes && <div className="text-xs text-muted">{r.pet.notes}</div>}
              {isOrg && r.kind === "pet" && (
                <div className="border-t border-line pt-2 mt-auto">
                  <AdoptionToggle
                    tenantId={tenantId}
                    petId={r.id}
                    isAdoptable={r.pet?.isAdoptable ?? false}
                    adoptionNote={r.pet?.adoptionNote ?? null}
                  />
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
