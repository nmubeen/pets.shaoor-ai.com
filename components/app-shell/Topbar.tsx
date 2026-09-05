import Link from "next/link";
import { BellIcon, SearchIcon, MenuIcon } from "@/components/icons";
import { signOut } from "@/lib/actions/tenant";

export function Topbar({
  trialLabel,
  userInitials,
  onMenuClick,
}: {
  /** Computed server-side (app/app/layout.tsx) — see that file for why this can't be computed here (Date.now()-based, would mismatch on hydration since this component is part of AppShell's client bundle). */
  trialLabel: string | null;
  userInitials: string;
  onMenuClick?: () => void;
}) {
  return (
    <div className="h-14 flex-none border-b border-line bg-surface flex items-center justify-between px-4 sm:px-6 gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button onClick={onMenuClick} className="text-muted hover:text-ink transition md:hidden flex-none" aria-label="Open menu">
          <MenuIcon className="text-[1.2em]" />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted max-w-sm">
          <SearchIcon className="text-[1.05em]" />
          <span className="text-[.85rem]">Search pets, visits, orders…</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {trialLabel && (
          <Link
            href="/app/settings/billing"
            className="hidden sm:flex items-center gap-2 text-[.78rem] font-mono bg-accent/15 text-accent px-3 py-1.5 rounded-full hover:bg-accent/25 transition"
          >
            {trialLabel}
            <span className="underline">upgrade</span>
          </Link>
        )}
        <button className="text-muted hover:text-ink transition">
          <BellIcon className="text-[1.1em]" />
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-2 border border-line flex items-center justify-center text-[.68rem] font-semibold text-ink">
          {userInitials}
        </div>
        <form action={signOut}>
          <button className="text-xs text-muted hover:text-ink transition">Sign out</button>
        </form>
      </div>
    </div>
  );
}
