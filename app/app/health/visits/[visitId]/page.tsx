import { notFound } from "next/navigation";
import { VisitFormPage } from "@/components/health/VisitFormPage";
import { requireActiveAccount } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getVisits, getDueVaccinationNames } from "@/lib/health";
import { getProviders } from "@/lib/providers";
import { getServiceTypes } from "@/lib/care-services";

export default async function EditVisitPage({
  params,
  searchParams,
}: {
  params: Promise<{ visitId: string }>;
  /** `focus` — a vaccination/illness/medication row id, set when this page was opened via that row's "Edit (in visit)" link elsewhere on /app/health, so VisitForm can jump straight to it. */
  searchParams: Promise<{ focus?: string }>;
}) {
  const { visitId } = await params;
  const { focus } = await searchParams;
  const { supabase, active } = await requireActiveAccount();

  const [roster, visits, providers, serviceTypes, dueVaccinationNames] = await Promise.all([
    getRoster(supabase, active.tenantId),
    getVisits(supabase, active.tenantId),
    getProviders(supabase, active.tenantId, ["vet", "grooming"]),
    getServiceTypes(supabase, active.tenantId),
    getDueVaccinationNames(supabase, active.tenantId),
  ]);

  const editing = visits.find((v) => v.id === visitId);
  if (!editing) notFound();

  return (
    <VisitFormPage
      tenantId={active.tenantId}
      roster={roster}
      providers={providers}
      serviceTypes={serviceTypes}
      dueVaccinationNames={dueVaccinationNames}
      visits={visits}
      editing={editing}
      focusRowId={focus ?? null}
    />
  );
}
