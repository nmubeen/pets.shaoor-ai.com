"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui";
import { WhatsAppIcon } from "@/components/icons";
import { createVetShareLink, revokeVetShareLink } from "@/lib/actions/vet-share";
import { whatsAppHref } from "@/lib/whatsapp";
import { formatDate } from "@/lib/format";
import type { VetShareLink } from "@/lib/vet-share";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";

function messageFor(tenantName: string, url: string): string {
  return `Hi, here's ${tenantName}'s pet health summary for your review: ${url}`;
}

/**
 * The owner's control for handing a vet a no-login link to this same page
 * (app/v/[token]/page.tsx) — enter the vet's WhatsApp number, generate a
 * unique link, and open WhatsApp with it prefilled. Unlike the parent-link
 * pattern this mirrors, several links can be live at once (one per vet, or
 * a fresh one per visit), so this renders the whole list rather than a
 * single generate/revoke pair — each row keeps its own active/revoked
 * state and the owner can revoke any one of them independently, e.g. right
 * after that vet's visit is done.
 */
export function VetShareLinks({ tenantId, tenantName, links }: { tenantId: string; tenantName: string; links: VetShareLink[] }) {
  const [items, setItems] = useState(links);
  const [number, setNumber] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!number.trim()) {
      setError("Enter a WhatsApp number.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createVetShareLink(tenantId, number);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setItems((prev) => [result.link, ...prev]);
      setNumber("");
    });
  }

  function handleRevoke(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await revokeVetShareLink(tenantId, id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setItems((prev) => prev.map((l) => (l.id === id ? { ...l, revokedAt: new Date().toISOString() } : l)));
    });
  }

  function copy(url: string, id: string) {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => {});
  }

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div>
        <div className="text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold mb-1">Share with a vet</div>
        <p className="text-sm text-muted">
          Send this read-only summary to a vet over WhatsApp — no account needed on their end. Revoke a link any time, e.g. once the visit is done.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Vet's WhatsApp number"
          className={`${field} flex-1 min-w-[180px]`}
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending}
          className="text-xs font-semibold text-white bg-(image:--gradient-button-bg) rounded-lg px-3.5 py-2.5 hover:brightness-110 transition disabled:opacity-60 flex-none"
        >
          {isPending ? "Generating…" : "Get link"}
        </button>
      </div>
      {error && <p className="text-xs text-coral">{error}</p>}

      {items.length > 0 && (
        <div className="flex flex-col divide-y divide-line">
          {items.map((link) => {
            const active = !link.revokedAt;
            return (
              <div key={link.id} className="py-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{link.whatsappNumber}</span>
                  <span className={`text-[.66rem] uppercase tracking-[.05em] ${active ? "text-good" : "text-muted"}`}>
                    {active ? "Active" : "Revoked"}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  Sent {formatDate(new Date(link.createdAt))}
                  {link.lastViewedAt ? ` · Last viewed ${formatDate(new Date(link.lastViewedAt))}` : ""}
                </div>
                {active && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs bg-surface-2 border border-line rounded-lg px-2.5 py-1.5 truncate max-w-[240px]">
                      {link.url}
                    </code>
                    <button
                      type="button"
                      onClick={() => copy(link.url, link.id)}
                      className="text-xs text-primary border border-line rounded-lg px-3 py-1.5 hover:bg-surface-2 transition"
                    >
                      {copiedId === link.id ? "Copied" : "Copy"}
                    </button>
                    <a
                      href={whatsAppHref(link.whatsappNumber, messageFor(tenantName, link.url))}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-good border border-line rounded-lg px-3 py-1.5 hover:bg-surface-2 transition"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                      Send
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRevoke(link.id)}
                      disabled={isPending}
                      className="text-xs text-coral border border-line rounded-lg px-3 py-1.5 hover:bg-surface-2 transition disabled:opacity-60"
                    >
                      Revoke
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
