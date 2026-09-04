"use client";

// Holds the mobile-drawer open/close state shared between the hamburger
// button (in Topbar) and the sidebar it toggles (Sidebar becomes a fixed
// overlay below the md breakpoint instead of a static 220px column).
import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/app-shell/Sidebar";
import { Topbar } from "@/components/app-shell/Topbar";
import type { ActiveMembership } from "@/lib/tenant";

export function AppShell({
  active,
  memberships,
  trialEndsAt,
  userInitials,
  children,
}: {
  active: ActiveMembership;
  memberships: ActiveMembership[];
  trialEndsAt: string | null;
  userInitials: string;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-paper">
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          aria-hidden
        />
      )}
      <Sidebar
        active={active}
        memberships={memberships}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          trialEndsAt={trialEndsAt}
          userInitials={userInitials}
          onMenuClick={() => setMobileOpen((v) => !v)}
        />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-[1100px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
