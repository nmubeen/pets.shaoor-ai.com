"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, Avatar } from "@/components/ui";
import { PlusIcon, GlobeIcon, PinIcon, MailIcon, PhoneIcon, WhatsAppIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { SettingsBackLink } from "@/components/settings/SettingsBackLink";
import { ProviderForm } from "@/components/providers/ProviderForm";
import { deleteProvider } from "@/lib/actions/providers";
import type { Provider } from "@/lib/providers";
import { CATEGORY_LABEL } from "@/lib/provider-categories";
import type { ServiceProviderCategory } from "@/lib/database.types";

/** wa.me only accepts digits — no "+", spaces, or dashes. */
function whatsAppHref(phone: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;
}

/** One contact icon in a card's header action row, left of Edit/Delete — external links (website, location, WhatsApp) open in a new tab, tel:/mailto: don't. */
function ContactIcon({ href, label, external = true, children }: { href: string; label: string; external?: boolean; children: ReactNode }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="text-muted hover:text-(--color-primary-text) transition"
      aria-label={label}
      title={label}
    >
      {children}
    </a>
  );
}

function DeleteButton({ tenantId, providerId }: { tenantId: string; providerId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (!confirm("Delete this provider? Past visits/orders that used it keep their record — this only removes it from the list.")) return;
          await deleteProvider(tenantId, providerId);
          router.refresh();
        })
      }
      className="text-muted hover:text-coral transition disabled:opacity-60"
      aria-label="Delete provider"
      title="Delete"
    >
      {pending ? "…" : <TrashIcon className="w-4 h-4" />}
    </button>
  );
}

function ProviderCard({
  tenantId,
  provider: p,
  onEdit,
}: {
  tenantId: string;
  provider: Provider;
  onEdit: () => void;
}) {
  const isVet = p.category === "vet";
  const isOnlineShop = p.category === "online_shop";

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <Avatar label={p.initials} color={p.color} photoUrl={p.logoUrl} />
        <div className="flex items-center gap-3">
          {isVet && p.website && (
            <ContactIcon href={p.website} label="Website">
              <GlobeIcon className="w-4 h-4" />
            </ContactIcon>
          )}
          {isVet && p.locationUrl && (
            <ContactIcon href={p.locationUrl} label="Location">
              <PinIcon className="w-4 h-4" />
            </ContactIcon>
          )}
          {isVet && p.email && (
            <ContactIcon href={`mailto:${p.email}`} label="Email" external={false}>
              <MailIcon className="w-4 h-4" />
            </ContactIcon>
          )}
          {isVet && p.phone && (
            <ContactIcon href={`tel:${p.phone}`} label="Call" external={false}>
              <PhoneIcon className="w-4 h-4" />
            </ContactIcon>
          )}
          {isVet && p.phone && (
            <ContactIcon href={whatsAppHref(p.phone)} label="WhatsApp">
              <WhatsAppIcon className="w-4 h-4" />
            </ContactIcon>
          )}
          {isOnlineShop && p.website && (
            <ContactIcon href={p.website} label="Website">
              <GlobeIcon className="w-4 h-4" />
            </ContactIcon>
          )}
          <button onClick={onEdit} className="text-muted hover:text-ink transition" aria-label="Edit provider" title="Edit">
            <PencilIcon className="w-4 h-4" />
          </button>
          <DeleteButton tenantId={tenantId} providerId={p.id} />
        </div>
      </div>
      <div>
        <div className="font-semibold text-base">{p.name}</div>
        <div className="text-xs text-muted mt-0.5 flex flex-col gap-0.5">
          {!isVet && p.phone && <span>{p.phone}</span>}
          {!isVet && p.email && <span>{p.email}</span>}
          {p.address && <span>{p.address}</span>}
          {p.businessHours && <span>🕒 {p.businessHours}</span>}
          {!isVet && !isOnlineShop && (p.website || p.locationUrl) && (
            <span>
              {p.website && (
                <a href={p.website} target="_blank" rel="noreferrer" className="text-(--color-primary-text) hover:underline">
                  Website
                </a>
              )}
              {p.website && p.locationUrl && " | "}
              {p.locationUrl && (
                <a href={p.locationUrl} target="_blank" rel="noreferrer" className="text-(--color-primary-text) hover:underline">
                  Location
                </a>
              )}
            </span>
          )}
          {isOnlineShop && p.locationUrl && (
            <span>
              <a href={p.locationUrl} target="_blank" rel="noreferrer" className="text-(--color-primary-text) hover:underline">
                Location
              </a>
            </span>
          )}
        </div>
        {p.notes && <div className="text-xs text-muted mt-2">{p.notes}</div>}
      </div>
    </Card>
  );
}

/** One category's worth of providers — its own heading, "Add" trigger, and grid. Stacked one per category on the page (in the order `categories` was given) rather than switched between with tabs, so both are visible at once. */
function CategorySection({
  tenantId,
  category,
  providers,
}: {
  tenantId: string;
  category: ServiceProviderCategory;
  providers: Provider[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">{CATEGORY_LABEL[category]}</h2>
        <button
          onClick={() => {
            setEditingId(null);
            setShowAdd((v) => !v);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--color-primary-text) hover:underline"
        >
          <PlusIcon className="w-[.9em] h-[.9em]" />
          Add
        </button>
      </div>

      {showAdd && <ProviderForm tenantId={tenantId} category={category} onDone={() => setShowAdd(false)} />}

      {providers.length === 0 && !showAdd ? (
        <Card className="p-6 text-center text-sm text-muted">
          No {CATEGORY_LABEL[category].toLowerCase()} yet.
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((p) =>
            editingId === p.id ? (
              <div key={p.id} className="sm:col-span-2 lg:col-span-3">
                <ProviderForm
                  tenantId={tenantId}
                  category={category}
                  mode="edit"
                  initial={p}
                  onDone={() => {
                    setEditingId(null);
                    router.refresh();
                  }}
                />
              </div>
            ) : (
              <ProviderCard key={p.id} tenantId={tenantId} provider={p} onEdit={() => setEditingId(p.id)} />
            )
          )}
        </div>
      )}
    </div>
  );
}

export function ProvidersView({
  tenantId,
  providers,
  categories,
  title,
  description,
}: {
  tenantId: string;
  providers: Provider[];
  /** Which categories this page covers, in the order they're shown as sections — Settings splits providers into two pages/tiles ("Hospitals & Grooming Centers" vs. "Shopping (Online and Offline)") rather than one page with all four. */
  categories: ServiceProviderCategory[];
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <SettingsBackLink />
      <div>
        <h1 className="text-2xl mb-1 text-(--color-primary-text)">{title}</h1>
        <p className="text-sm text-muted">{description}</p>
      </div>

      {categories.map((c) => (
        <CategorySection key={c} tenantId={tenantId} category={c} providers={providers.filter((p) => p.category === c)} />
      ))}
    </div>
  );
}
