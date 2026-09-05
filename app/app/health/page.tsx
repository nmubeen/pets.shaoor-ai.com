import { HealthView } from "@/components/health/HealthView";
import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getVisits, getIllnesses, getVaccinations, getDueVaccinationNames } from "@/lib/health";
import { getProviders } from "@/lib/providers";
import { getMedications } from "@/lib/medications";
import { getWeightHistory } from "@/lib/growth";
import { getServiceTypes } from "@/lib/care-services";

export default async function HealthPage() {
  const { supabase, active } = await requireActiveMembership();

  const [
    roster,
    visits,
    illnesses,
    vaccinations,
    visitProviders,
    vetProviders,
    medications,
    weightHistory,
    serviceTypes,
    dueVaccinationNames,
  ] = await Promise.all([
    getRoster(supabase, active.tenantId),
    getVisits(supabase, active.tenantId),
    getIllnesses(supabase, active.tenantId),
    getVaccinations(supabase, active.tenantId),
    getProviders(supabase, active.tenantId, ["vet", "grooming"]),
    getProviders(supabase, active.tenantId, ["vet"]),
    getMedications(supabase, active.tenantId),
    getWeightHistory(supabase, active.tenantId),
    getServiceTypes(supabase, active.tenantId),
    getDueVaccinationNames(supabase, active.tenantId),
  ]);

  return (
    <HealthView
      tenantId={active.tenantId}
      role={active.role}
      roster={roster}
      visitProviders={visitProviders}
      vetProviders={vetProviders}
      visits={visits}
      illnesses={illnesses}
      vaccinations={vaccinations}
      medications={medications}
      weightHistory={weightHistory}
      serviceTypes={serviceTypes}
      dueVaccinationNames={dueVaccinationNames}
    />
  );
}
