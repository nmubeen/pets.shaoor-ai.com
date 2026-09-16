import Link from "next/link";
import { StethoIcon, ScissorsIcon, DropIcon } from "@/components/icons";
import type { PetHealthSummary } from "@/lib/pet-links";

/**
 * The health facts actually worth knowing at a glance on a pet's card —
 * when it was last seen, every recurring service's (deworming, grooming,
 * ...) next due date, and what vaccination is coming up. Replaced the old
 * per-section record counts (10 visits, 4 vaccinations, ...) — those
 * weren't actionable, these are. A line only renders when there's
 * something to show; nothing renders if the pet has no health records at
 * all.
 */
export function PetHealthLinks({ petId, summary }: { petId: string; summary: PetHealthSummary | undefined }) {
  if (!summary || (!summary.lastVisit && summary.nextServices.length === 0 && !summary.nextVaccination)) return null;

  return (
    <ul className="flex flex-col gap-0.5 pl-2">
      {summary.lastVisit && (
        <li>
          <Link
            href={`/app/health?tab=visits&pet=${petId}`}
            className="inline-flex items-center gap-1.5 text-xs text-(--color-primary-text) hover:underline"
          >
            <StethoIcon className="w-[.9em] h-[.9em] flex-none" />
            Last visit: {summary.lastVisit.date}
          </Link>
        </li>
      )}
      {summary.nextServices.map((service, i) => (
        <li key={`${service.label}-${i}`}>
          <Link
            href={`/app/health?tab=visits&pet=${petId}`}
            className={`inline-flex items-center gap-1.5 text-xs hover:underline ${
              service.overdue ? "text-coral" : "text-(--color-primary-text)"
            }`}
          >
            <ScissorsIcon className="w-[.9em] h-[.9em] flex-none" />
            {service.label} due: {service.date}
          </Link>
        </li>
      ))}
      {summary.nextVaccination && (
        <li>
          <Link
            href={`/app/health?tab=vaccinations&pet=${petId}`}
            className={`inline-flex items-center gap-1.5 text-xs hover:underline ${
              summary.nextVaccination.overdue ? "text-coral" : "text-(--color-primary-text)"
            }`}
          >
            <DropIcon className="w-[.9em] h-[.9em] flex-none" />
            {summary.nextVaccination.label}: {summary.nextVaccination.date}
          </Link>
        </li>
      )}
    </ul>
  );
}
