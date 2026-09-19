"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PawIcon,
  HomeIcon,
  HabitatIcon,
  StethoIcon,
  CartIcon,
  ImageIcon,
  ClipboardIcon,
  SettingsIcon,
} from "@/components/icons";
import type { ActiveAccount } from "@/lib/tenant";
import { BrandLogo } from "@/components/BrandLogo";

// Settings is one entry here now, not its own sub-section — Care and
// Billing (and everything else Settings covers) moved to tiles on
// /app/settings itself.
const nav = [
  { href: "/app", label: "Home", icon: HomeIcon },
  { href: "/app/pets", label: "Pets", icon: PawIcon },
  { href: "/app/habitats", label: "Habitats", icon: HabitatIcon },
  { href: "/app/health", label: "Health", icon: StethoIcon },
  { href: "/app/shopping", label: "Shopping", icon: CartIcon },
  { href: "/app/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/app/vet-view", label: "Vet View", icon: ClipboardIcon },
  { href: "/app/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar({
  active,
  mobileOpen = false,
  onNavigate,
}: {
  active: ActiveAccount;
  /** Below the md breakpoint, the sidebar is a fixed drawer instead of a static column. */
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  return (
    <aside
      className={`w-[220px] flex-none bg-(image:--gradient-primary-bg) text-primary-ink flex flex-col min-h-screen fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
    >
      <div className="px-4 pt-5 pb-4 relative">
        <Link href="/app" className="flex items-center gap-3 font-semibold text-base opacity-95 mb-4">
          <BrandLogo />
          Shaoor-AI Pets
        </Link>
        <div className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-center truncate">{active.tenantName}</div>
      </div>

      <nav className="flex-1 px-3 pb-4 flex flex-col gap-0.5">
        {nav.map((item) => {
          const isNavActive = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${isNavActive ? "bg-white/15 opacity-100" : "opacity-72 hover:opacity-100 hover:bg-white/10"
                }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
