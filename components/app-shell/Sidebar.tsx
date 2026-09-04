"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PawIcon,
  HomeIcon,
  StethoIcon,
  CartIcon,
  ImageIcon,
  InvoiceIcon,
  UsersIcon,
} from "@/components/icons";
import { switchTenant } from "@/lib/actions/tenant";
import type { ActiveMembership } from "@/lib/tenant";

const nav = [
  { href: "/app", label: "Home", icon: HomeIcon },
  { href: "/app/pets", label: "Pets", icon: PawIcon },
  { href: "/app/health", label: "Health", icon: StethoIcon },
  { href: "/app/shopping", label: "Shopping", icon: CartIcon },
  { href: "/app/gallery", label: "Gallery", icon: ImageIcon },
];

const settingsNav = [
  { href: "/app/settings/billing", label: "Billing", icon: InvoiceIcon },
  { href: "/app/settings/team", label: "Team", icon: UsersIcon },
];

export function Sidebar({
  active,
  memberships,
}: {
  active: ActiveMembership;
  memberships: ActiveMembership[];
}) {
  const pathname = usePathname();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  return (
    <aside className="w-[220px] flex-none bg-primary text-primary-ink flex flex-col min-h-screen">
      <div className="px-4 pt-5 pb-4 relative">
        <Link href="/app" className="flex items-center gap-2 font-serif font-semibold text-base opacity-95 mb-4">
          <PawIcon />
          Menagerie
        </Link>
        <button
          onClick={() => setSwitcherOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 bg-white/10 hover:bg-white/15 transition rounded-lg px-3 py-2 text-xs"
        >
          <span className="truncate">🏠 {active.tenantName}</span>
          <span className="opacity-70">⌄</span>
        </button>
        {switcherOpen && (
          <div className="absolute left-4 right-4 top-[76px] z-10 bg-surface text-ink border border-line rounded-lg shadow-lg overflow-hidden">
            {memberships.map((m) => (
              <button
                key={m.tenantId}
                onClick={() => switchTenant(m.tenantId)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-2 transition ${
                  m.tenantId === active.tenantId ? "font-semibold" : ""
                }`}
              >
                🏠 {m.tenantName}
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 flex flex-col gap-0.5">
        {nav.map((item) => {
          const isNavActive = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                isNavActive ? "bg-white/15 opacity-100" : "opacity-72 hover:opacity-100 hover:bg-white/10"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 pt-2 border-t border-white/10 flex flex-col gap-0.5">
        <div className="px-3 pb-1 text-[.62rem] uppercase tracking-[.06em] opacity-55">Settings</div>
        {settingsNav.map((item) => {
          const isNavActive = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                isNavActive ? "bg-white/15 opacity-100" : "opacity-72 hover:opacity-100 hover:bg-white/10"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
