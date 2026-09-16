"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { BackIcon, ForwardIcon } from "@/components/icons";
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

  // Steps through `visits` in the same newest-first order the list itself
  // renders in — "previous" is the one shown above this one, "next" the
  // one below. Only meaningful when editing; a brand-new visit has no
  // position in the list yet.
  const editIndex = editing ? visits.findIndex((v) => v.id === editing.id) : -1;
  const prevVisit = editIndex > 0 ? visits[editIndex - 1] : null;
  const nextVisit = editIndex >= 0 && editIndex < visits.length - 1 ? visits[editIndex + 1] : null;

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
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl text-(--color-primary-text)">{editing ? "Edit visit" : "Log a visit"}</h1>
          {editing && (
            <div className="flex items-center gap-1.5 flex-none">
              {prevVisit ? (
                <Link
                  href={`/app/health/visits/${prevVisit.id}`}
                  className="text-muted hover:text-ink border border-line rounded-md p-1.5 transition"
                  aria-label="Previous visit"
                  title={`Previous: ${prevVisit.date}${prevVisit.provider ? ` — ${prevVisit.provider}` : ""}`}
                >
                  <BackIcon className="w-4 h-4" />
                </Link>
              ) : (
                <span className="text-muted/40 border border-line rounded-md p-1.5" aria-hidden>
                  <BackIcon className="w-4 h-4" />
                </span>
              )}
              {nextVisit ? (
                <Link
                  href={`/app/health/visits/${nextVisit.id}`}
                  className="text-muted hover:text-ink border border-line rounded-md p-1.5 transition"
                  aria-label="Next visit"
                  title={`Next: ${nextVisit.date}${nextVisit.provider ? ` — ${nextVisit.provider}` : ""}`}
                >
                  <ForwardIcon className="w-4 h-4" />
                </Link>
              ) : (
                <span className="text-muted/40 border border-line rounded-md p-1.5" aria-hidden>
                  <ForwardIcon className="w-4 h-4" />
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <VisitForm
        key={editing?.id ?? "new"}
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
