import Link from "next/link";
import { BackIcon } from "@/components/icons";

/** Replaces CareTabs now that Service Types/Vaccinations/Shopping Categories/Providers/Household are reached from the Settings hub (tiles) rather than a shared tab row — each is its own standalone page. */
export function SettingsBackLink() {
  return (
    <Link href="/app/settings" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition">
      <BackIcon className="w-[.9em] h-[.9em]" />
      Back to Settings
    </Link>
  );
}
