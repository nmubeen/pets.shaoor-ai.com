import Link from "next/link";
import { ScissorsIcon, DropIcon } from "@/components/icons";

/**
 * Service Types and Vaccinations are two real pages now (not two panels
 * stacked on one /app/settings/care screen) — this is their shared tab
 * row, styled like Health's own TabRow but navigating via real links
 * instead of client-side tab state, since each is its own route.
 */
const TABS = [
  { href: "/app/settings/care/service-types", key: "service-types" as const, label: "Service Types", icon: ScissorsIcon },
  { href: "/app/settings/care/vaccinations", key: "vaccinations" as const, label: "Vaccinations", icon: DropIcon },
];

export function CareTabs({ active }: { active: "service-types" | "vaccinations" }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition ${
            active === t.key ? "bg-surface border border-line font-semibold text-ink" : "text-muted hover:text-ink"
          }`}
        >
          <t.icon className="w-[.9em] h-[.9em]" />
          {t.label}
        </Link>
      ))}
    </div>
  );
}
