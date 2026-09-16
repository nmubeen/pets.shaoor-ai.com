"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { BackIcon } from "@/components/icons";
import { VisitForm } from "@/components/health/VisitForm";
import type { RosterItem } from "@/lib/roster";
import type { Provider } from "@/lib/providers";
import type { ServiceType } from "@/lib/care-services";
import type { VisitRow } from "@/lib/health";

/**
 * The dedicated page VisitForm now always lives on — /app/health/visits/new
 * and /app/health/visits/[visitId] both render this, VisitsPanel's "Log a
 * visit"/Edit are now plain links rather than in-place state, and this is
 * the shared shell (back link, title, and the "where do we land after
 * Save/Cancel" logic) both routes need identically.
 */
export function VisitFormPage({
  tenantId,
  roster,
  providers,
  serviceTypes,
  dueVaccinationNames,
  visits,
  editing,
  focusRowId,
}: {
  tenantId: string;
  roster: RosterItem[];
  providers: Provider[];
  serviceTypes: ServiceType[];
  dueVaccinationNames: string[];
  visits: VisitRow[];
  editing?: VisitRow;
  focusRowId?: string | null;
}) {
  const router = useRouter();

  function handleDone(createdId?: string) {
    if (createdId) {
      // A brand-new visit — land back on the list with it highlighted,
      // same as the old in-place flow used to (VisitsPanel reads
      // `highlight` off the URL for this).
      router.push(`/app/health?tab=visits&highlight=${createdId}`);
      return;
    }
    // Save on an edit, or Cancel either way — both should return to
    // wherever this page was opened from (the visits list, at the same
    // scroll position, via the browser's own back-navigation scroll
    // restoration) rather than a fixed redirect that would lose that.
    if (window.history.length > 1) router.back();
    else router.push("/app/health?tab=visits");
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <Link href="/app/health?tab=visits" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition mb-3">
          <BackIcon className="w-[.9em] h-[.9em]" />
          Back to visits
        </Link>
        <h1 className="text-2xl text-(--color-primary-text)">{editing ? "Edit visit" : "Log a visit"}</h1>
      </div>
      <VisitForm
        tenantId={tenantId}
        roster={roster}
        providers={providers}
        serviceTypes={serviceTypes}
        dueVaccinationNames={dueVaccinationNames}
        visits={visits}
        editing={editing}
        focusRowId={focusRowId}
        onDone={handleDone}
      />
    </div>
  );
}
