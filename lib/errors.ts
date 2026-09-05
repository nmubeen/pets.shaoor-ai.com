// Translates a handful of raw Postgres/PostgREST errors into messages a
// non-technical user can actually act on, before they reach a Server
// Action's { error } return value (and from there, straight into some
// component's <p className="text-coral">{error}</p>). Deliberately a
// narrow allowlist, not a generic "prettify any error" layer — anything
// not explicitly recognized here still falls through to the raw
// error.message, same as before this file existed, so a real/unexpected
// DB error is never silently hidden.
export function friendlyErrorMessage(error: { message: string; code?: string | null }): string {
  // 42501 = insufficient_privilege — this is exactly what every
  // can_write_tenant()-gated RLS policy raises when a read-only role
  // (viewer, vet_view, social) or a write attempt from the wrong tenant
  // hits an insert/update/delete: "new row violates row-level security
  // policy for table \"...\"". True whenever this fires: someone without
  // write access reached a write action — normally that's already
  // blocked at the UI level (Edit/Delete/Add hidden for their role), so
  // seeing this at all usually means a UI gate is missing somewhere, not
  // that the person did anything wrong themselves.
  if (error.code === "42501") return "You don't have permission to make changes here.";
  return error.message;
}
