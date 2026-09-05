import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getVisits, getIllnesses, getVaccinations } from "@/lib/health";
import { getMedications } from "@/lib/medications";
import { getWeightHistory } from "@/lib/growth";
import { buildVetSummaries } from "@/lib/vet-view";
import { VetView } from "@/components/vet-view/VetView";

export default async function VetViewPage() {
  const { supabase, active } = await requireActiveMembership();

  const [roster, visits, illnesses, vaccinations, medications, weightHistory] = await Promise.all([
    getRoster(supabase, active.tenantId),
    getVisits(supabase, active.tenantId),
    getIllnesses(supabase, active.tenantId),
    getVaccinations(supabase, active.tenantId),
    getMedications(supabase, active.tenantId),
    getWeightHistory(supabase, active.tenantId),
  ]);

  const pets = roster.filter((r) => r.kind === "pet");
  const summaries = buildVetSummaries(pets, visits, illnesses, vaccinations, medications, weightHistory);

  return <VetView tenantName={active.tenantName} summaries={summaries} />;
}
