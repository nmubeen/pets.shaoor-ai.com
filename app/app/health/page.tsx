import { HealthView } from "@/components/health/HealthView";
import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getVetVisits, getIllnesses, getVaccinations, getGroomingVisits } from "@/lib/health";

export default async function HealthPage() {
  const { supabase, active } = await requireActiveMembership();

  const [roster, visits, illnesses, vaccinations, grooming] = await Promise.all([
    getRoster(supabase, active.tenantId),
    getVetVisits(supabase, active.tenantId),
    getIllnesses(supabase, active.tenantId),
    getVaccinations(supabase, active.tenantId),
    getGroomingVisits(supabase, active.tenantId),
  ]);

  return (
    <HealthView
      tenantId={active.tenantId}
      roster={roster}
      visits={visits}
      illnesses={illnesses}
      vaccinations={vaccinations}
      grooming={grooming}
    />
  );
}
