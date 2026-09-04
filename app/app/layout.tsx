import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { requireActiveMembership } from "@/lib/tenant";

export default async function AppShellLayout({ children }: { children: ReactNode }) {
  const { user, memberships, active } = await requireActiveMembership();
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
