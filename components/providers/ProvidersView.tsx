"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Avatar } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { ProviderForm } from "@/components/providers/ProviderForm";
import { deleteProvider } from "@/lib/actions/providers";
import type { Provider } from "@/lib/providers";
import { CATEGORY_LABEL } from "@/lib/provider-categories";
import type { ServiceProviderCategory } from "@/lib/database.types";

const CATEGORIES: ServiceProviderCategory[] = ["vet", "grooming", "offline_shop", "online_shop"];

function DeleteButton({ tenantId, providerId }: { tenantId: string; providerId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteProvider(tenantId, providerId);
          router.refresh();
        })
      }
      className="text-xs text-muted hover:text-coral transition disabled:opacity-60"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}

export function ProvidersView({ tenantId, providers }: { tenantId: string; providers: Provider[] }) {
  const [active, setActive] = useState<ServiceProviderCategory>("vet");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  const rows = providers.filter((p) => p.category === active);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Service providers</h1>
          <p className="text-sm text-muted">Vets, groomers, and shops — kept here, selected from elsewhere in the app</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setShowAdd((v) => !v);
          }}
          className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition"
        >
          <PlusIcon className="w-[.9em] h-[.9em]" />
          Add provider
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => {
              setActive(c);
              setShowAdd(false);
              setEditingId(null);
            }}
            className={`text-sm px-4 py-2 rounded-lg transition ${
              active === c ? "bg-surface border border-line font-semibold text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      {showAdd && <ProviderForm tenantId={tenantId} category={active} onDone={() => setShowAdd(false)} />}

      {rows.length === 0 && !showAdd ? (
        <Card className="p-6 text-center text-sm text-muted">
          No {CATEGORY_LABEL[active].toLowerCase()} yet.
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => {
            if (editingId === p.id) {
              return (
                <div key={p.id} className="sm:col-span-2 lg:col-span-3">
                  <ProviderForm
                    tenantId={tenantId}
                    category={active}
                    mode="edit"
                    initial={p}
                    onDone={() => {
                      setEditingId(null);
                      router.refresh();
                    }}
                  />
                </div>
              );
            }

            return (
              <Card key={p.id} className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <Avatar label={p.initials} color={p.color} photoUrl={p.logoUrl} />
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditingId(p.id)} className="text-xs text-muted hover:text-ink transition">
                      Edit
                    </button>
                    <DeleteButton tenantId={tenantId} providerId={p.id} />
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-base">{p.name}</div>
                  <div className="text-xs text-muted mt-0.5 flex flex-col gap-0.5">
                    {p.phone && <span>{p.phone}</span>}
                    {p.address && <span>{p.address}</span>}
                    {p.businessHours && <span>🕒 {p.businessHours}</span>}
                    {p.mapsUrl && (
                      <a href={p.mapsUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        📍 View on map
                      </a>
                    )}
                    {p.website && (
                      <a href={p.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        Click here
                      </a>
                    )}
                  </div>
                  {p.notes && <div className="text-xs text-muted mt-2">{p.notes}</div>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
