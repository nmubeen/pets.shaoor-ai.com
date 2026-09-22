// Shared display formatting — was duplicated (and inconsistent: no decimal
// places) across lib/health.ts, lib/shopping.ts, app/app/page.tsx,
// components/shopping/ShoppingView.tsx, and the expense-summary cron route.

/** ₹1,234.50 — Indian digit grouping (lakh/crore), always 2 decimal places. */
export function formatCurrency(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * dd-mmm-yyyy, e.g. "05-Sep-2026" — the one date format used in every list
 * across the app. Deliberately not `toLocaleDateString` (no locale gives
 * this exact dash-separated, zero-padded shape) — each call site still
 * owns how it parses its own ISO string into a Date (date-only vs. full
 * timestamp differ in whether "T00:00:00" needs appending), this only
 * standardizes what happens once it has one.
 */
export function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  return `${day}-${MONTHS[date.getMonth()]}-${date.getFullYear()}`;
}

/** "08:00:00" or "08:00" (24h, as stored) -> "8:00 AM" — no timezone conversion, this is a wall-clock time, not an instant (see 0041_feeding.sql). */
export function formatTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h24 = Number(hStr);
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mStr ?? "00"} ${suffix}`;
}

/**
 * "8:00 AM" / "8:00am" / "08:00 PM" (free-typed, case-insensitive, space
 * before AM/PM optional) -> "20:00" (24h, for storage) — the inverse of
 * formatTime. Returns null for anything that doesn't parse, so the caller
 * can show a validation error instead of silently storing garbage. Used
 * for a plain hh:mm am/pm text field instead of a native time input.
 */
export function parseTimeInput(raw: string): string | null {
  const m = raw.trim().match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*([AaPp])\.?[Mm]\.?$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = m[2];
  const isPM = m[3].toUpperCase() === "P";
  if (isPM && hour !== 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}
