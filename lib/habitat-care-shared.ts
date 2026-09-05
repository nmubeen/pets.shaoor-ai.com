// Split out from lib/habitat-care.ts (which has "import server-only") so
// the client-side HabitatCarePanel can use these without pulling in
// server-only code — Next.js poisons the whole module for any importer,
// not just the parts that actually touch the database. Same pattern as
// lib/provider-categories.ts.

/** Quick-log buttons on a habitat's Care panel — a sensible default repeat cadence for each, used the first time that title is logged (see lib/actions/tasks.ts's logHabitatCare). Anything typed into the custom form gets no default — its own due date/interval, if any, is entered explicitly there. */
export const HABITAT_CARE_PRESETS: { title: string; repeatIntervalDays: number }[] = [
  { title: "Feed", repeatIntervalDays: 1 },
  { title: "Clean enclosure", repeatIntervalDays: 7 },
  { title: "Water change", repeatIntervalDays: 7 },
];

export type HabitatCareRow = {
  id: string;
  title: string;
  dueDate: string | null;
  dueLabel: string;
  overdue: boolean;
  repeatIntervalDays: number | null;
  /** Set (and formatted dd-mmm-yyyy) only on a completed row shown in history — null for an open one. */
  completedDate: string | null;
};

export type HabitatCare = {
  /** Not-yet-done, soonest due first. */
  open: HabitatCareRow[];
  /** Done, most recently first — capped so one habitat's history can't balloon the page. */
  history: HabitatCareRow[];
};
