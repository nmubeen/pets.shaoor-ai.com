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
