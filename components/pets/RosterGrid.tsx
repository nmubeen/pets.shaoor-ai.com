"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Avatar } from "@/components/ui";
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
          <Card key={r.id} className="p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <Avatar label={r.initials} color={r.color} photoUrl={r.photoUrl} />
              <button
                onClick={() => setEditingId(r.id)}
                className="text-xs text-muted hover:text-ink transition"
              >
                Edit
              </button>
            </div>
            <div>
              <div className="font-semibold text-base">{r.name}</div>
              <div className="text-xs text-muted mt-0.5">{r.subtitle}</div>
              {r.pet?.microchipId && (
                <div className="text-[.68rem] text-muted mt-1 font-mono">Chip: {r.pet.microchipId}</div>
              )}
              {r.pet?.notes && <div className="text-xs text-muted mt-2">{r.pet.notes}</div>}
            </div>
            {isOrg && r.kind === "pet" && (
              <div className="border-t border-line pt-3">
                <AdoptionToggle
                  tenantId={tenantId}
                  petId={r.id}
                  isAdoptable={r.pet?.isAdoptable ?? false}
                  adoptionNote={r.pet?.adoptionNote ?? null}
                />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
