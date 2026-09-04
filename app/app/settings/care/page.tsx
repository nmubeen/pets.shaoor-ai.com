import { requireActiveMembership } from "@/lib/tenant";
import { getServiceTypes } from "@/lib/care-services";
import { getVaccinationPlans } from "@/lib/vaccination-plans";
import { ServiceTypesPanel } from "@/components/settings/ServiceTypesPanel";
import { VaccinationPlansPanel } from "@/components/settings/VaccinationPlansPanel";

export default async function CareSettingsPage() {
  const { supabase, active } = await requireActiveMembership();

  const [serviceTypes, plans] = await Promise.all([
    getServiceTypes(supabase, active.tenantId),
    getVaccinationPlans(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl mb-1">Care</h1>
        <p className="text-sm text-muted">Service types and vaccination plans used across Health</p>
      </div>

      <ServiceTypesPanel tenantId={active.tenantId} serviceTypes={serviceTypes} />
      <VaccinationPlansPanel tenantId={active.tenantId} plans={plans} />
    </div>
  );
}
