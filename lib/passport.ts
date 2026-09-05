// Builds the loose, narrative summary line shown on a Pet Passport's
// per-visit "visa" page — a flowing sentence rather than the structured
// label/value rows Health and Vet View use elsewhere, to match a real
// passport's handwritten-annotation feel. Also holds randomPlacement and
// handwritingInk, the two small deterministic-per-seed helpers behind
// that same handwritten look (position + rotation, ink color). No server
// access needed (pure text/formatting over already-fetched data), so
// this stays import-free of "server-only" and can be used from a client
// component.
import type { VisitRow } from "@/lib/health";

export function buildVisitSummaryText(visit: VisitRow): string {
  const bits: string[] = [];

  const services = visit.services.filter((s) => s.name.trim().toLowerCase() !== "consultation").map((s) => s.name);
  if (services.length > 0) bits.push(`received ${services.join(", ")}`);

  if (visit.vaccinations.length > 0) {
    bits.push(`vaccinated against ${visit.vaccinations.map((v) => v.name).join(", ")}`);
  }
  if (visit.illnesses.length > 0) {
    bits.push(`treated for ${visit.illnesses.map((i) => i.name).join(", ")}`);
  }
  if (visit.medications.length > 0) {
    bits.push(`prescribed ${visit.medications.map((m) => m.name).join(", ")}`);
  }
  if (visit.weightKg !== null) bits.push(`weighed ${visit.weightKg} kg on this visit`);
  if (visit.notes) bits.push(visit.notes);

  const opening = visit.reason ? `${visit.reason}.` : "";
  const rest = bits.length > 0 ? `${bits.join("; ")}.` : "Routine examination — no further remarks on file.";

  return [opening, rest].filter(Boolean).join(" ");
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

export type Placement = { topPct: number; leftPct: number; rotateDeg: number };

/**
 * A deterministic pseudo-random spot (top/left, as percentages of the
 * page) and rotation within the given ranges — so a visit page's stamp
 * and handwritten note land somewhere different each time, like an
 * actual passport where nothing lines up twice, without ever calling
 * Math.random(): that would reroll on every render, including at
 * hydration, and could mismatch between the server's HTML and the
 * client's own pass (the same reason handwritingInk below is
 * hash-seeded, not random). One hash is split across three shifted
 * ranges (>>> 5, >>> 11) to get three pseudo-independent numbers out of
 * a single seed instead of hashing three times.
 */
export function randomPlacement(
  seed: string,
  ranges: { top: [number, number]; left: [number, number]; rotate: [number, number] }
): Placement {
  const h = hashSeed(seed);
  const pick = (n: number, [min, max]: [number, number]) => min + (n % (max - min + 1));
  return {
    topPct: pick(h, ranges.top),
    leftPct: pick(h >>> 5, ranges.left),
    rotateDeg: pick(h >>> 11, ranges.rotate),
  };
}

// A small set of pen-ink blues, none of them the app's own accent/primary
// tokens — the passport is deliberately un-themed. One is picked per page
// (keyed by a stable seed: the visit id, or the page kind for the data/
// vaccinations pages) so neighboring "handwritten" pages don't all read in
// the exact same ink, without resorting to Math.random() — which, called
// during render, would reroll on every hydration/re-render and could
// mismatch between the server's HTML and the client's own pass.
const HAND_INKS = ["#1B4B8C", "#2454A6", "#1E5FBF", "#2B3A82", "#0F3D91", "#3457A6", "#1A4F99"];

/** Deterministic per-page "handwriting ink" shade of blue — same seed always yields the same color, so it's safe to call during SSR and again at hydration. */
export function handwritingInk(seed: string): string {
  return HAND_INKS[hashSeed(seed) % HAND_INKS.length];
}
