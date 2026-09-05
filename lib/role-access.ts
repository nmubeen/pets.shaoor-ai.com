// Which /app/* paths a restricted role (vet_view, social) may reach —
// shared by app/app/layout.tsx's hard redirect and Sidebar's nav
// filtering, so the two never drift out of sync. Every other role is
// unrestricted (sees/reaches everything, unchanged).
import type { MembershipRole } from "@/lib/database.types";

const RESTRICTED_PATHS: Partial<Record<MembershipRole, string[]>> = {
  vet_view: ["/app/vet-view"],
  social: ["/app/pets", "/app/gallery"],
};

// Must stay reachable regardless of role — /app/pending is where every
// page's own requireActiveMembership() sends a commercially-blocked
// workspace; without this, a blocked vet_view/social user would bounce
// forever between their role's redirect and the pending redirect.
const ALWAYS_ALLOWED = ["/app/pending"];

function matches(paths: string[], pathname: string): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** The one path a restricted role should land on — null for an unrestricted role (nothing to redirect to). */
export function roleHome(role: MembershipRole): string | null {
  return RESTRICTED_PATHS[role]?.[0] ?? null;
}

export function isPathAllowedForRole(role: MembershipRole, pathname: string): boolean {
  if (matches(ALWAYS_ALLOWED, pathname)) return true;
  const allowed = RESTRICTED_PATHS[role];
  if (!allowed) return true;
  return matches(allowed, pathname);
}
