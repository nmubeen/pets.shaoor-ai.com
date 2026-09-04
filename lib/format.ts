// Shared display formatting — was duplicated (and inconsistent: no decimal
// places) across lib/health.ts, lib/shopping.ts, app/app/page.tsx,
// components/shopping/ShoppingView.tsx, and the expense-summary cron route.

/** ₹1,234.50 — Indian digit grouping (lakh/crore), always 2 decimal places. */
export function formatCurrency(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
