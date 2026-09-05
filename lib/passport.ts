// Builds the loose, narrative summary line shown on a Pet Passport's
// per-visit "visa" page — a flowing sentence rather than the structured
// label/value rows Health and Vet View use elsewhere, to match a real
// passport's handwritten-annotation feel. Also holds passportTilt and
// handwritingInk, the two small deterministic-per-seed helpers behind
// that same handwritten look (rotation, ink color). No server access
// needed (pure text/formatting over already-fetched data), so this stays
// import-free of "server-only" and can be used from a client component.
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

/** A small, deterministic per-visit tilt (in degrees) so the summary text on each passport page reads like an organic handwritten annotation rather than perfectly aligned type — stable across renders (keyed by the visit's own id, not Math.random()). */
export function passportTilt(seed: string): number {
  return ((hashSeed(seed) % 5) - 2) * 0.6; // -1.2deg .. 1.2deg
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
