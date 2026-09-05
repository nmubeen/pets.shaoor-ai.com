import Link from "next/link";
import { StethoIcon, HeartIcon, DropIcon, VialIcon, ChartIcon } from "@/components/icons";
import type { PetLinks } from "@/lib/pet-links";

/** One link per Health sub-section a pet's card can jump into — same icon Health's own TabRow uses for each, so a section reads the same way everywhere. */
const HEALTH_LINKS: { tab: string; label: string; icon: typeof StethoIcon; flag: keyof PetLinks }[] = [
  { tab: "visits", label: "Visits", icon: StethoIcon, flag: "visits" },
  { tab: "illnesses", label: "Illnesses", icon: HeartIcon, flag: "illnesses" },
  { tab: "vaccinations", label: "Vaccinations", icon: DropIcon, flag: "vaccinations" },
  { tab: "medications", label: "Medications", icon: VialIcon, flag: "medications" },
  { tab: "growth", label: "Growth", icon: ChartIcon, flag: "growth" },
];

/**
 * Compact list of Health sub-sections this pet actually has records in —
 * each jumps to that tab, pre-filtered to this pet (see HealthView's
 * initialTab/initialPetId), with a small count badge showing how many
 * entries are there. A section with zero entries isn't shown at all;
 * nothing renders if the pet has no health records anywhere.
 */
export function PetHealthLinks({ petId, links }: { petId: string; links: PetLinks | undefined }) {
  const shown = links
    ? HEALTH_LINKS.map((l) => ({ ...l, count: links[l.flag] })).filter((l) => l.count > 0)
    : [];
  if (shown.length === 0) return null;

  return (
    <ul className="flex flex-col gap-0.5 pl-2">
      {shown.map((l) => (
        <li key={l.tab}>
          <Link
            href={`/app/health?tab=${l.tab}&pet=${petId}`}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <l.icon className="w-[.9em] h-[.9em] flex-none" />
            {l.label}
            <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-surface-2 text-[.62rem] font-semibold text-muted leading-none">
              {l.count}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
