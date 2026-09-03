import Link from "next/link";
import { BellIcon, SearchIcon } from "@/components/icons";
import { workspace } from "@/lib/mock-data";

export function Topbar() {
  return (
    <div className="h-14 flex-none border-b border-line bg-surface flex items-center justify-between px-6 gap-4">
      <div className="flex items-center gap-2 text-sm text-muted flex-1 max-w-sm">
        <SearchIcon className="text-[1.05em]" />
        <span className="text-[.85rem]">Search pets, visits, orders…</span>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/app/settings/billing"
          className="hidden sm:flex items-center gap-2 text-[.78rem] font-mono bg-accent/15 text-accent px-3 py-1.5 rounded-full hover:bg-accent/25 transition"
        >
          Trial ends in {workspace.trialDaysLeft} days
          <span className="underline">upgrade</span>
        </Link>
        <button className="text-muted hover:text-ink transition">
          <BellIcon className="text-[1.1em]" />
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-2 border border-line flex items-center justify-center text-[.68rem] font-semibold text-ink">
          YO
        </div>
      </div>
    </div>
  );
}
