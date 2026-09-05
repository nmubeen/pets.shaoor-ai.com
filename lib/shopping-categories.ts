// The Shopping order category list. Deliberately plain strings on a text
// column (supabase/migrations/0030_shopping_order_category.sql), not a
// Postgres enum like service_providers.category — that one needs its own
// migration (and, per Postgres's own rule, a *separate* one from
// anything that uses the new value in the same transaction) every time a
// category is added. This list is expected to keep growing, so adding
// one here is a one-line change with no migration at all. Only ever add
// to this list, don't remove/rename an entry once it's shipped — an
// order already saved with it would otherwise show a <select> that
// silently falls back to the first option, and saving that order again
// would quietly overwrite its real category. No "server-only" import —
// both server and client components (the order form's <select>, the
// orders table) use this directly.
export const SHOPPING_CATEGORIES = [
  "Food",
  "Treats",
  "Toys",
  "Grooming & Hygiene",
  "Health & Medicine",
  "Accessories",
  "Bedding & Litter",
  "Other",
] as const;

export type ShoppingCategory = (typeof SHOPPING_CATEGORIES)[number];
