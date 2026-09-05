"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { BackIcon } from "@/components/icons";
import { SPECIES_LABEL } from "@/lib/species-labels";
import { SEX_LABEL, sterilizationLabel } from "@/lib/pet-labels";
import { formatDate } from "@/lib/format";
import { buildVisitSummaryText, passportTilt } from "@/lib/passport";
import type { RosterItem } from "@/lib/roster";
import type { VisitRow, HealthRow } from "@/lib/health";

// Deliberately fixed, not theme-aware — a passport looks the same page or
// night, unlike the rest of the app's light/dark palette.
const COVER = "#1F4B3F";
const PAPER = "#F6F1E4";
const INK = "#1F332B";
const STAMP = "#8B2E2E";
const GOOD = "#2E6B45";

type PassportPage = { kind: "data" } | { kind: "visit"; visit: VisitRow } | { kind: "vaccinations" };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-dashed" style={{ borderColor: `${INK}33` }}>
      <span className="text-[9px] uppercase tracking-[0.1em] flex-none" style={{ color: `${INK}99` }}>
        {label}
      </span>
      <span className="text-[11px] font-semibold text-right" style={{ color: INK }}>
        {value}
      </span>
    </div>
  );
}

function PageFooter({ n, total }: { n: number; total: number }) {
  return (
    <div className="absolute bottom-3 left-0 right-0 text-center text-[9px] tracking-[0.15em]" style={{ color: `${INK}88` }}>
      PAGE {n} OF {total}
    </div>
  );
}

function PassportPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-full w-full p-5 pb-8 flex flex-col relative overflow-hidden" style={{ background: PAPER }}>
      {children}
    </div>
  );
}

function DataPage({
  pet,
  tenantName,
  ageLabel,
  n,
  total,
}: {
  pet: RosterItem;
  tenantName: string;
  ageLabel: string | null;
  n: number;
  total: number;
}) {
  const p = pet.pet;
  return (
    <PassportPageShell>
      <div className="text-center mb-3">
        <div className="text-[9px] tracking-[0.3em] uppercase" style={{ color: `${INK}99` }}>
          {tenantName}
        </div>
        <div className="text-sm font-bold tracking-[0.25em] uppercase mt-1" style={{ color: COVER, fontFamily: "var(--font-serif)" }}>
          Pet Passport
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <div className="w-24 h-28 flex-none border-2 overflow-hidden bg-white" style={{ borderColor: COVER }}>
          {pet.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-xl font-bold text-white"
              style={{ background: pet.color }}
            >
              {pet.initials}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold truncate" style={{ color: COVER, fontFamily: "var(--font-serif)" }}>
            {pet.name}
          </div>
          {p && (
            <div className="text-[10px]" style={{ color: `${INK}cc` }}>
              {SPECIES_LABEL[p.species]} · {p.breed}
            </div>
          )}
        </div>
      </div>

      {p && (
        <div className="mt-4 flex flex-col gap-0.5">
          <Field label="Gender" value={SEX_LABEL[p.sex] ?? "Unknown"} />
          <Field label="Date of birth" value={p.birthDate ? formatDate(new Date(`${p.birthDate}T00:00:00`)) : "Unknown"} />
          <Field label="Age" value={ageLabel ?? "Unknown"} />
          <Field label="Colour / markings" value={p.color ?? "—"} />
          <Field label="Passport no." value={p.microchipId ?? "—"} />
          <Field label="Sterilisation" value={sterilizationLabel(p.sex, p.neutered) ?? "Unknown"} />
        </div>
      )}

      <div className="mt-auto text-[9px] text-center pt-3" style={{ color: `${INK}88` }}>
        Issued by {tenantName}
      </div>
      <PageFooter n={n} total={total} />
    </PassportPageShell>
  );
}

function VisitPage({ visit, n, total }: { visit: VisitRow; n: number; total: number }) {
  const tilt = passportTilt(visit.id);
  const summary = buildVisitSummaryText(visit);
  return (
    <PassportPageShell>
      <div className="absolute top-8 right-5" style={{ transform: `rotate(${-10 + tilt}deg)` }}>
        <div
          className="w-32 h-32 rounded-full border-[3px] flex flex-col items-center justify-center text-center px-3"
          style={{ borderColor: STAMP, borderStyle: "double", color: STAMP, opacity: 0.82 }}
        >
          <div className="text-[8px] font-bold uppercase leading-tight">{visit.provider ?? "Clinic visit"}</div>
          <div className="text-[12px] font-bold mt-1">{visit.date}</div>
          {visit.doctor && <div className="text-[7px] uppercase mt-1">Dr. {visit.doctor}</div>}
          <div className="text-[7px] uppercase mt-1 tracking-[0.2em]">Verified</div>
        </div>
      </div>
      <div
        className="mt-44 text-[11px] leading-6 pr-4 italic"
        style={{ color: INK, transform: `rotate(${tilt}deg)` }}
      >
        {summary}
      </div>
      <PageFooter n={n} total={total} />
    </PassportPageShell>
  );
}

function VaccinationsPage({ vaccinations, n, total }: { vaccinations: HealthRow[]; n: number; total: number }) {
  return (
    <PassportPageShell>
      <div className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-4" style={{ color: COVER, fontFamily: "var(--font-serif)" }}>
        Vaccination Record
      </div>
      {vaccinations.length === 0 ? (
        <p className="text-[11px] text-center mt-6" style={{ color: `${INK}99` }}>
          No vaccinations on record.
        </p>
      ) : (
        <div className="flex flex-col gap-0.5 overflow-y-auto flex-1">
          {vaccinations.map((v) => (
            <div
              key={v.id}
              className="flex justify-between gap-2 py-1.5 border-b border-dashed text-[10px]"
              style={{ borderColor: `${INK}33`, color: INK }}
            >
              <span className="font-semibold truncate">{v.reason}</span>
              <span className="flex-none">{v.date}</span>
              <span className="flex-none uppercase font-semibold" style={{ color: v.statusRaw === "complete" ? GOOD : STAMP }}>
                {v.status}
              </span>
            </div>
          ))}
        </div>
      )}
      <PageFooter n={n} total={total} />
    </PassportPageShell>
  );
}

/**
 * A pet's health history styled and paged like an actual passport, opened
 * as a carousel (one page visible, prev/next + swipe + dots, not a
 * scrolling document): a data page (photo, breed, DOB, passport no. —
 * mirroring a real passport's ID page), one "visa" page per visit (a
 * rotated rubber-stamp for date + hospital, then the rest of that visit's
 * facts as one loosely-tilted narrative line — lib/passport.ts's
 * buildVisitSummaryText/passportTilt), and a closing vaccination record
 * page. Fixed light/dark colors throughout (not the app's theme tokens) —
 * a passport looks the same regardless of the viewer's color scheme.
 */
export function PetPassport({
  tenantName,
  pet,
  ageLabel,
  visits,
  vaccinations,
}: {
  tenantName: string;
  pet: RosterItem;
  /** Computed server-side (app/app/pets/[petId]/passport/page.tsx) — see lib/vet-view.ts's own ageLabel field for why this can't be computed here (Date.now()-based, would mismatch on hydration). */
  ageLabel: string | null;
  visits: VisitRow[];
  vaccinations: HealthRow[];
}) {
  const pages: PassportPage[] = [
    { kind: "data" },
    ...visits.map((visit): PassportPage => ({ kind: "visit", visit })),
    { kind: "vaccinations" },
  ];
  const total = pages.length;
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  function goTo(i: number) {
    setIndex(Math.max(0, Math.min(total - 1, i)));
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goTo(index - 1);
      if (e.key === "ArrowRight") goTo(index + 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 40) goTo(index - 1);
    else if (dx < -40) goTo(index + 1);
    touchStartX.current = null;
  }

  const page = pages[index];

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="w-full max-w-[420px] flex items-center justify-between">
        <Link href="/app/pets" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition">
          <BackIcon className="w-[.9em] h-[.9em]" />
          Back to Pets
        </Link>
        <h1 className="text-sm font-semibold">{pet.name}&rsquo;s Passport</h1>
      </div>

      <div className="relative w-full max-w-[420px]">
        <div
          className="relative w-full aspect-[5/7] rounded-2xl overflow-hidden shadow-2xl border-[10px] select-none"
          style={{ borderColor: COVER }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {page.kind === "data" && <DataPage pet={pet} tenantName={tenantName} ageLabel={ageLabel} n={index + 1} total={total} />}
          {page.kind === "visit" && <VisitPage visit={page.visit} n={index + 1} total={total} />}
          {page.kind === "vaccinations" && <VaccinationsPage vaccinations={vaccinations} n={index + 1} total={total} />}
        </div>

        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-surface border border-line shadow flex items-center justify-center disabled:opacity-30 transition"
          aria-label="Previous page"
        >
          <BackIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index === total - 1}
          className="absolute right-[-16px] top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-surface border border-line shadow flex items-center justify-center disabled:opacity-30 transition"
          aria-label="Next page"
        >
          <BackIcon className="w-4 h-4 rotate-180" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center max-w-[420px]">
        {pages.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition ${i === index ? "w-4 bg-primary" : "w-1.5 bg-line"}`}
            aria-label={`Go to page ${i + 1}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted">
        Page {index + 1} of {total}
      </p>
    </div>
  );
}
