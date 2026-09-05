import { requireActiveMembership } from "@/lib/tenant";
import { getVaccinationPlans } from "@/lib/vaccination-plans";
import { VaccinationPlansView } from "@/components/settings/VaccinationPlansView";

export default async function VaccinationPlansPage() {
  const { supabase, active } = await requireActiveMembership();
  const plans = await getVaccinationPlans(supabase);

  return <VaccinationPlansView tenantId={active.tenantId} plans={plans} />;
}
