"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui";
import { AdoptionToggle } from "@/components/pets/AdoptionToggle";
import { SuggestScheduleButton } from "@/components/pets/SuggestScheduleButton";
import { AddRosterForm } from "@/components/roster/AddRosterForm";
import { deletePet, deleteHabitat } from "@/lib/actions/roster";
import { StethoIcon, HeartIcon, DropIcon, VialIcon, ChartIcon } from "@/components/icons";
import type { RosterItem } from "@/lib/roster";
import type { PetLinks } from "@/lib/pet-links";

/** One bullet per Health sub-section a pet's card can link into, shown only when that pet has something logged there — see lib/pet-links.ts. */
const HEALTH_LINKS: { tab: string; label: string; icon: typeof StethoIcon; flag: keyof PetLinks }[] = [
  { tab: "visits", label: "Visits", icon: StethoIcon, flag: "visits" },
  { tab: "illnesses", label: "Illnesses", icon: HeartIcon, flag: "illnesses" },
  { tab: "vaccinations", label: "Vaccinations", icon: DropIcon, flag: "vaccinations" },
  { tab: "medications", label: "Medications", icon: VialIcon, flag: "medications" },
  { tab: "growth", label: "Growth", icon: ChartIcon, flag: "growth" },
];

/** Bullet list of Health sub-sections this pet actually has records in — each jumps to that tab, pre-filtered to this pet (see HealthView's initialTab/initialPetId). Nothing renders if the pet has no health records at all. */
function PetHealthLinks({ petId, links }: { petId: string; links: PetLinks | undefined }) {
  const shown = links ? HEALTH_LINKS.filter((l) => links[l.flag]) : [];
  if (shown.length === 0) return null;

  return (
    <ul className="flex flex-col gap-0.5 pl-2">
      {shown.map((l) => (
        <li key={l.tab}>
          <Link
            href={`/app/health?tab=${l.tab}&pet=${petId}`}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <l.icon className="w-[.9em] h-[.9em] flex-none" />
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DeleteButton({ tenantId, item }: { tenantId: string; item: RosterItem }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (!confirm(`Delete ${item.name}? This also removes every health record, order, task, and photo logged for ${item.kind === "pet" ? "it" : "this habitat"}.`)) return;
          const action = item.kind === "pet" ? deletePet : deleteHabitat;
          await action(tenantId, item.id);
          router.refresh();
        })
      }
      className="text-xs text-muted hover:text-coral transition disabled:opacity-60 flex-none"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}

export function RosterGrid({
  tenantId,
  roster,
  isOrg,
  petLinks,
}: {
  tenantId: string;
  roster: RosterItem[];
  isOrg: boolean;
  /** Which Health sub-sections have at least one record for each pet — keyed by pet id, habitats never appear here. */
  petLinks: Record<string, PetLinks>;
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
                <div className="flex items-center gap-3 flex-none">
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
              {r.kind === "pet" && <PetHealthLinks petId={r.id} links={petLinks[r.id]} />}
              {r.kind === "pet" && r.pet?.birthDate && (
                <SuggestScheduleButton tenantId={tenantId} petId={r.id} />
              )}
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
