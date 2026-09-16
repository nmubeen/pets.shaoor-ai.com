import { HealthView } from "@/components/health/HealthView";
import { requireActiveAccount } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getVisits, getIllnesses, getVaccinations } from "@/lib/health";
import { getProviders } from "@/lib/providers";
import { getMedications } from "@/lib/medications";
import { getWeightHistory } from "@/lib/growth";

export default async function HealthPage() {
  const { supabase, active } = await requireActiveAccount();

  const [roster, visits, illnesses, vaccinations, vetProviders, medications, weightHistory] = await Promise.all([
    getRoster(supabase, active.tenantId),
    getVisits(supabase, active.tenantId),
    getIllnesses(supabase, active.tenantId),
    getVaccinations(supabase, active.tenantId),
    getProviders(supabase, active.tenantId, ["vet"]),
    getMedications(supabase, active.tenantId),
    getWeightHistory(supabase, active.tenantId),
  ]);

  return (
    <HealthView
      tenantId={active.tenantId}
      roster={roster}
      vetProviders={vetProviders}
      visits={visits}
      illnesses={illnesses}
      vaccinations={vaccinations}
      medications={medications}
      weightHistory={weightHistory}
    />
  );
}
