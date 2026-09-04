import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { requireMembershipUnchecked } from "@/lib/tenant";

// Deliberately unchecked here — /app/pending and /app/settings/billing
// live under this same layout and must render even when the active
// workspace's subscription is blocked (each other page under /app still
// gates itself individually via requireActiveMembership()).
export default async function AppShellLayout({ children }: { children: ReactNode }) {
  const { user, memberships, active } = await requireMembershipUnchecked();
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
