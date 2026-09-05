import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/AppShell";
import { requireMembershipUnchecked } from "@/lib/tenant";
import { isPathAllowedForRole, roleHome } from "@/lib/role-access";

// Computed here, server-side, and passed down as a plain string —
// Topbar is part of AppShell's client bundle (it takes an onMenuClick
// function prop), so it renders during both the server's SSR pass and
// the client's hydration pass; calling this Date.now()-based function
// again there (a few ms after this same render) is exactly the kind of
// thing that causes a hydration mismatch (the same fix applied to
// lib/vet-view.ts's ageLabel and the Pet Passport page).
function trialLabel(trialEndsAt: string | null): string | null {
  if (!trialEndsAt) return null;
  const days = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "Trial ended";
  return `Trial ends in ${days} day${days === 1 ? "" : "s"}`;
}

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
    <AppShell active={active} memberships={memberships} trialLabel={trialLabel(active.trialEndsAt)} userInitials={userInitials}>
      {children}
    </AppShell>
  );
}
