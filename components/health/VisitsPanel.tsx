"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui";
import { PlusIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { PetFilterSelect } from "@/components/health/PetFilterSelect";
import { deleteVisit } from "@/lib/actions/health";
import type { VisitRow } from "@/lib/health";
import type { RosterItem } from "@/lib/roster";

function LineItems({ label, items }: { label: string; items: { name: string; cost?: string | null }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="text-xs text-muted mt-1.5">
      <span className="uppercase tracking-[.05em] text-[.62rem]">{label}</span>
      <ul className="mt-0.5 flex flex-col gap-0.5 pl-4 list-disc marker:text-line">
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

/**
 * Collapsed by default to just the two header lines (date/provider, pet +
 * its details) — the line items, notes, and prescription photo only
 * render once expanded, so a long visit history scans quickly instead of
 * every card sprawling. The prescription photo shows full-size here
 * (rather than the small thumbnail used elsewhere) since expanding is
 * already an explicit "show me everything" action.
 */
function VisitCard({
  tenantId,
  visit,
  highlighted,
}: {
  tenantId: string;
  visit: VisitRow;
  highlighted: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    visit.services.length > 0 ||
    visit.vaccinations.length > 0 ||
    visit.illnesses.length > 0 ||
    visit.medications.length > 0 ||
    Boolean(visit.notes) ||
    Boolean(visit.prescriptionPhotoUrl);

  return (
    <Card
      id={`visit-${visit.id}`}
      className={`p-4 transition-colors duration-500 ${highlighted ? "bg-accent/15" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium">
            {visit.date}
            {visit.provider && <> · {visit.provider}</>}
          </div>
          <div className="text-xs text-muted mt-0.5">
            <span className="font-semibold text-ink">{visit.who}</span>
            {visit.age && <> · {visit.age}</>}
            {visit.doctor && <> · Dr. {visit.doctor}</>}
            {visit.weightKg !== null && <> · {visit.weightKg} kg</>}
            {visit.temperatureF !== null && <> · {visit.temperatureF}°F</>}
          </div>
        </div>
        <div className="flex items-start gap-3 flex-none">
          {visit.cost && <span className="font-mono text-sm">{visit.cost}</span>}
          <VisitActions tenantId={tenantId} visitId={visit.id} />
        </div>
      </div>

      {hasDetails && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-(--color-primary-text) hover:underline mt-2"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      {expanded && (
        <>
          <LineItems label="Services" items={visit.services} />
          <LineItems label="Vaccinations given" items={visit.vaccinations} />
          <LineItems label="Illnesses diagnosed" items={visit.illnesses} />
          <LineItems label="Medications prescribed" items={visit.medications.map((m) => ({ name: m.dosage ? `${m.name} — ${m.dosage}` : m.name }))} />
          {visit.prescriptionPhotoUrl && (
            <a href={visit.prescriptionPhotoUrl} target="_blank" rel="noreferrer" className="block mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={visit.prescriptionPhotoUrl}
                alt="Prescription"
                className="w-full max-h-[70vh] object-contain rounded-lg border border-line bg-paper hover:brightness-95 transition"
              />
            </a>
          )}
          {visit.notes && <div className="text-xs text-muted mt-2">{visit.notes}</div>}
        </>
      )}
    </Card>
  );
}

function VisitActions({ tenantId, visitId }: { tenantId: string; visitId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div className="flex items-center gap-2 flex-none">
      <Link
        href={`/app/health/visits/${visitId}`}
        className="text-muted hover:text-ink border border-line rounded-md p-1.5 transition"
        aria-label="Edit visit"
        title="Edit"
      >
        <PencilIcon className="w-4 h-4" />
      </Link>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (!confirm("Delete this visit? Its services and vaccinations given are removed with it (any completed vaccination itself stays on record, just unlinked from this visit).")) return;
            await deleteVisit(tenantId, visitId);
            router.refresh();
          })
        }
        className="text-muted hover:text-coral border border-line rounded-md p-1.5 transition disabled:opacity-60"
        aria-label="Delete visit"
        title="Delete"
      >
        {pending ? "…" : <TrashIcon className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function VisitsPanel({
  tenantId,
  roster,
  visits,
  initialPetFilter,
}: {
  tenantId: string;
  roster: RosterItem[];
  visits: VisitRow[];
  /** Seeds the pet filter — set when arriving from a pet card's "Visits" quick-link (see HealthView). */
  initialPetFilter?: string;
}) {
  const searchParams = useSearchParams();
  const [petFilter, setPetFilter] = useState(initialPetFilter ?? "all");
  const pets = roster.filter((r) => r.kind === "pet");
  const filtered = petFilter === "all" ? visits : visits.filter((v) => v.petId === petFilter);

  // Set from ?highlight=<id> — VisitFormPage lands back here with it after
  // logging a brand-new visit on its own page (the form itself no longer
  // renders in-place, so this is the one piece of that flow's result that
  // still has to cross the page boundary).
  const [highlightId, setHighlightId] = useState<string | null>(() => searchParams.get("highlight"));

  useEffect(() => {
    if (!highlightId) return;
    if (!filtered.some((v) => v.id === highlightId)) return;
    const el = document.getElementById(`visit-${highlightId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(timer);
    // `visits`/`petFilter`, not `filtered` — the latter is a fresh array
    // whenever petFilter isn't "all", which would restart this effect
    // (and its 2.5s timer) on any unrelated re-render while highlighted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits, petFilter, highlightId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {pets.length > 0 && (
          <Link
            href="/app/health/visits/new"
            className="inline-flex items-center gap-2 text-sm font-semibold bg-(image:--gradient-button-bg) text-white px-4 py-2.5 rounded-lg hover:brightness-110 transition"
          >
            <PlusIcon className="w-[.9em] h-[.9em]" />
            Log a visit
          </Link>
        )}
      </div>

      <PetFilterSelect roster={roster} value={petFilter} onChange={setPetFilter} />

      {pets.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">Add a pet first — visits are logged per pet.</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">Nothing logged here yet.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((v) => (
            <VisitCard key={v.id} tenantId={tenantId} visit={v} highlighted={v.id === highlightId} />
          ))}
        </div>
      )}
    </div>
  );
}
