import { HealthView } from "@/components/health/HealthView";
import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getVetVisits, getIllnesses, getVaccinations, getGroomingVisits } from "@/lib/health";
import { getProviders } from "@/lib/providers";
import { getMedications } from "@/lib/medications";
import { getWeightHistory } from "@/lib/growth";

export default async function HealthPage() {
  const { supabase, active } = await requireActiveMembership();

  const [roster, visits, illnesses, vaccinations, grooming, vetProviders, groomingProviders, medications, weightHistory] =
    await Promise.all([
      getRoster(supabase, active.tenantId),
      getVetVisits(supabase, active.tenantId),
      getIllnesses(supabase, active.tenantId),
      getVaccinations(supabase, active.tenantId),
      getGroomingVisits(supabase, active.tenantId),
      getProviders(supabase, active.tenantId, ["vet"]),
      getProviders(supabase, active.tenantId, ["grooming"]),
      getMedications(supabase, active.tenantId),
      getWeightHistory(supabase, active.tenantId),
    ]);

  return (
    <HealthView
      tenantId={active.tenantId}
      roster={roster}
      vetProviders={vetProviders}
      groomingProviders={groomingProviders}
      visits={visits}
      illnesses={illnesses}
      vaccinations={vaccinations}
      grooming={grooming}
      medications={medications}
      weightHistory={weightHistory}
    />
  );
}
