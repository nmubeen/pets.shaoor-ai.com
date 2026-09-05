"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { AddRosterForm } from "@/components/roster/AddRosterForm";
import { HabitatCarePanel } from "@/components/habitats/HabitatCarePanel";
import { deleteHabitat } from "@/lib/actions/roster";
import type { RosterItem } from "@/lib/roster";
import type { HabitatCare } from "@/lib/habitat-care-shared";

function DeleteButton({ tenantId, item }: { tenantId: string; item: RosterItem }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (!confirm(`Delete ${item.name}? This also removes every care record, order, task, and photo logged for this habitat.`)) return;
          await deleteHabitat(tenantId, item.id);
          router.refresh();
        })
      }
      className="text-xs text-muted hover:text-coral transition disabled:opacity-60 flex-none"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}

const EMPTY_CARE: HabitatCare = { open: [], history: [] };

export function HabitatsGrid({
  tenantId,
  habitats,
  canWrite,
  careByHabitat,
}: {
  tenantId: string;
  habitats: RosterItem[];
  canWrite: boolean;
  /** Open + recent-history care_tasks for each habitat — keyed by habitat id. */
  careByHabitat: Record<string, HabitatCare>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {habitats.map((r) => {
        if (editingId === r.id) {
          return (
            <div key={r.id} className="sm:col-span-2 lg:col-span-3">
              <AddRosterForm
                tenantId={tenantId}
                mode="edit"
                initial={r}
                fixedKind="habitat"
                onDone={() => {
                  setEditingId(null);
                  router.refresh();
                }}
              />
            </div>
          );
        }

        return (
          <Card key={r.id} className="p-0 overflow-hidden flex flex-col">
            <div className="flex">
              <div className="w-28 flex-none">
                {r.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photoUrl} alt={r.name} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full min-h-[132px] flex items-center justify-center text-xl font-bold text-white"
                    style={{ background: r.color }}
                  >
                    {r.initials}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-base truncate">{r.name}</div>
                  {canWrite && (
                    <div className="flex items-center gap-3 flex-none">
                      <button
                        onClick={() => setEditingId(r.id)}
                        className="text-xs text-muted hover:text-ink transition"
                      >
                        Edit
                      </button>
                      <DeleteButton tenantId={tenantId} item={r} />
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted">{r.subtitle}</div>
              </div>
            </div>
            <div className="px-4 pb-4">
              <HabitatCarePanel
                tenantId={tenantId}
                habitatId={r.id}
                canWrite={canWrite}
                care={careByHabitat[r.id] ?? EMPTY_CARE}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
