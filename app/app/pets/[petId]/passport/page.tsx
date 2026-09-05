import { notFound } from "next/navigation";
import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getVisits, getVaccinations } from "@/lib/health";
import { PetPassport } from "@/components/passport/PetPassport";

export default async function PetPassportPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const { supabase, active } = await requireActiveMembership();

  const [roster, visits, vaccinations] = await Promise.all([
    getRoster(supabase, active.tenantId),
    getVisits(supabase, active.tenantId),
    getVaccinations(supabase, active.tenantId),
  ]);

  const pet = roster.find((r) => r.id === petId && r.kind === "pet");
  if (!pet) notFound();

  // Oldest first — a passport's stamps accumulate in chronological order,
  // not newest-first like Health's own Visits list.
  const petVisits = visits.filter((v) => v.petId === petId).sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  const petVaccinations = vaccinations
    .filter((v) => v.petId === petId)
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso));

  return <PetPassport tenantName={active.tenantName} pet={pet} visits={petVisits} vaccinations={petVaccinations} />;
}
