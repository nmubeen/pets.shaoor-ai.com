import { requireActiveMembership } from "@/lib/tenant";
import { getServiceTypes } from "@/lib/care-services";
import { ServiceTypesView } from "@/components/settings/ServiceTypesView";

export default async function ServiceTypesPage() {
  const { supabase, active } = await requireActiveMembership();
  const serviceTypes = await getServiceTypes(supabase, active.tenantId);

  return <ServiceTypesView tenantId={active.tenantId} serviceTypes={serviceTypes} />;
}
