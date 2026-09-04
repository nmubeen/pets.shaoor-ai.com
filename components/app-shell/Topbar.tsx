import Link from "next/link";
import { BellIcon, SearchIcon, MenuIcon } from "@/components/icons";
import { signOut } from "@/lib/actions/tenant";

function trialLabel(trialEndsAt: string | null): string | null {
  if (!trialEndsAt) return null;
  const days = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "Trial ended";
  return `Trial ends in ${days} day${days === 1 ? "" : "s"}`;
}

export function Topbar({
  trialEndsAt,
  userInitials,
  onMenuClick,
}: {
  trialEndsAt: string | null;
  userInitials: string;
  onMenuClick?: () => void;
}) {
  const trial = trialLabel(trialEndsAt);

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
        {trial && (
          <Link
            href="/app/settings/billing"
            className="hidden sm:flex items-center gap-2 text-[.78rem] font-mono bg-accent/15 text-accent px-3 py-1.5 rounded-full hover:bg-accent/25 transition"
          >
            {trial}
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
