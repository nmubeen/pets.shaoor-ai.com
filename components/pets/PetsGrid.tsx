"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui";
import { AdoptionToggle } from "@/components/pets/AdoptionToggle";
import { SuggestScheduleButton } from "@/components/pets/SuggestScheduleButton";
import { PetHealthLinks } from "@/components/pets/PetHealthLinks";
import { AddRosterForm } from "@/components/roster/AddRosterForm";
import { PassportIcon } from "@/components/icons";
import { deletePet } from "@/lib/actions/roster";
import type { RosterItem } from "@/lib/roster";
import type { PetLinks } from "@/lib/pet-links";

function DeleteButton({ tenantId, item }: { tenantId: string; item: RosterItem }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (!confirm(`Delete ${item.name}? This also removes every health record, order, task, and photo logged for it.`)) return;
          await deletePet(tenantId, item.id);
          router.refresh();
        })
      }
      className="text-xs text-muted hover:text-coral transition disabled:opacity-60 flex-none"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}

export function PetsGrid({
  tenantId,
  pets,
  isOrg,
  petLinks,
}: {
  tenantId: string;
  pets: RosterItem[];
  isOrg: boolean;
  /** Which Health sub-sections (and how many entries in each) this pet has — keyed by pet id. */
  petLinks: Record<string, PetLinks>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {pets.map((r) => {
        if (editingId === r.id) {
          return (
            <div key={r.id} className="sm:col-span-2 lg:col-span-3">
              <AddRosterForm
                tenantId={tenantId}
                mode="edit"
                initial={r}
                fixedKind="pet"
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
                <div className="flex items-center gap-3 flex-none">
                  <Link
                    href={`/app/pets/${r.id}/passport`}
                    className="text-muted hover:text-primary transition"
                    aria-label={`${r.name}'s passport`}
                    title="Passport"
                  >
                    <PassportIcon className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => setEditingId(r.id)}
                    className="text-xs text-muted hover:text-ink transition"
                  >
                    Edit
                  </button>
                  <DeleteButton tenantId={tenantId} item={r} />
                </div>
              </div>
              <div className="text-xs text-muted">{r.subtitle}</div>
              {r.pet?.microchipId && (
                <div className="text-[.68rem] text-muted font-mono">Chip: {r.pet.microchipId}</div>
              )}
              {r.pet?.notes && <div className="text-xs text-muted">{r.pet.notes}</div>}
              <PetHealthLinks petId={r.id} links={petLinks[r.id]} />
              {r.pet?.birthDate && <SuggestScheduleButton tenantId={tenantId} petId={r.id} />}
              {isOrg && (
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
