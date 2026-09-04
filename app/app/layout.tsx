import type { ReactNode } from "react";
import { Sidebar } from "@/components/app-shell/Sidebar";
import { Topbar } from "@/components/app-shell/Topbar";
import { requireActiveMembership } from "@/lib/tenant";

export default async function AppShellLayout({ children }: { children: ReactNode }) {
  const { user, memberships, active } = await requireActiveMembership();
  const userInitials =
    (user.email ?? "?")
      .split("@")[0]
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <div className="min-h-screen flex bg-paper">
      <Sidebar active={active} memberships={memberships} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar trialEndsAt={active.trialEndsAt} userInitials={userInitials} />
        <main className="flex-1 p-6 md:p-8 max-w-[1100px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
