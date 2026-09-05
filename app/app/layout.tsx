import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/AppShell";
import { requireMembershipUnchecked } from "@/lib/tenant";
import { isPathAllowedForRole, roleHome } from "@/lib/role-access";

// Deliberately unchecked here — /app/pending and /app/settings/billing
// live under this same layout and must render even when the active
// workspace's subscription is blocked (each other page under /app still
// gates itself individually via requireActiveMembership()).
export default async function AppShellLayout({ children }: { children: ReactNode }) {
  const { user, memberships, active } = await requireMembershipUnchecked();

  // A restricted role (vet_view, social) is locked to its own one or two
  // pages — anything else redirects to its "home" (lib/role-access.ts).
  // The pathname comes from lib/supabase/proxy.ts's x-pathname header,
  // since a Server Component layout has no other way to see it.
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (!isPathAllowedForRole(active.role, pathname)) {
    const home = roleHome(active.role);
    if (home) redirect(home);
  }

  const userInitials =
    (user.email ?? "?")
      .split("@")[0]
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <AppShell active={active} memberships={memberships} trialEndsAt={active.trialEndsAt} userInitials={userInitials}>
      {children}
    </AppShell>
  );
}
