import { VisitFormPage } from "@/components/health/VisitFormPage";
import { requireActiveAccount } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getVisits, getDueVaccinationNames } from "@/lib/health";
import { getProviders } from "@/lib/providers";
import { getServiceTypes } from "@/lib/care-services";

export default async function NewVisitPage() {
  const { supabase, active } = await requireActiveAccount();

  const [roster, visits, providers, serviceTypes, dueVaccinationNames] = await Promise.all([
    getRoster(supabase, active.tenantId),
    getVisits(supabase, active.tenantId),
    getProviders(supabase, active.tenantId, ["vet", "grooming"]),
    getServiceTypes(supabase, active.tenantId),
    getDueVaccinationNames(supabase, active.tenantId),
  ]);

  return (
    <VisitFormPage
      tenantId={active.tenantId}
      roster={roster}
      providers={providers}
      serviceTypes={serviceTypes}
      dueVaccinationNames={dueVaccinationNames}
      visits={visits}
    />
  );
}
