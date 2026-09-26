import { requireActiveAccount } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getVisits, getIllnesses, getVaccinations } from "@/lib/health";
import { getMedications } from "@/lib/medications";
import { getWeightHistory } from "@/lib/growth";
import { buildVetSummaries } from "@/lib/vet-view";
import { getVetShareLinks } from "@/lib/vet-share";
import { VetView } from "@/components/vet-view/VetView";
import { VetShareLinks } from "@/components/vet-view/VetShareLinks";

export default async function VetViewPage() {
  const { supabase, active } = await requireActiveAccount();

  const [roster, visits, illnesses, vaccinations, medications, weightHistory, shareLinks] = await Promise.all([
    getRoster(supabase, active.tenantId),
    getVisits(supabase, active.tenantId),
    getIllnesses(supabase, active.tenantId),
    getVaccinations(supabase, active.tenantId),
    getMedications(supabase, active.tenantId),
    getWeightHistory(supabase, active.tenantId),
    getVetShareLinks(supabase, active.tenantId),
  ]);

  const pets = roster.filter((r) => r.kind === "pet");
  const summaries = buildVetSummaries(pets, visits, illnesses, vaccinations, medications, weightHistory);

  return (
    <>
      <div className="max-w-xl mx-auto mb-5">
        <VetShareLinks tenantId={active.tenantId} tenantName={active.tenantName} links={shareLinks} />
      </div>
      <VetView tenantName={active.tenantName} summaries={summaries} />
    </>
  );
}
