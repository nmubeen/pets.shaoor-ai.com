// Translates a handful of raw Postgres/PostgREST errors into messages a
// non-technical user can actually act on, before they reach a Server
// Action's { error } return value (and from there, straight into some
// component's <p className="text-coral">{error}</p>). Deliberately a
// narrow allowlist, not a generic "prettify any error" layer — anything
// not explicitly recognized here still falls through to the raw
// error.message, same as before this file existed, so a real/unexpected
// DB error is never silently hidden.
export function friendlyErrorMessage(error: { message: string; code?: string | null }): string {
  // RLS rejects access to another account's records.
  if (error.code === "42501") return "You don't have permission to make changes here.";
  return error.message;
}
