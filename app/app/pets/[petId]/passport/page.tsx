import { notFound } from "next/navigation";
import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getVisits, getVaccinations } from "@/lib/health";
import { ageLabel } from "@/lib/pet-labels";
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

  // Newest first — matches Health's own Visits list (and reads as "most
  // recent stamp first" when flipping through the passport).
  const petVisits = visits.filter((v) => v.petId === petId).sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  const petVaccinations = vaccinations
    .filter((v) => v.petId === petId)
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso));

  // Computed here, server-side, and passed down as a plain string —
  // PetPassport is a client component, and calling this Date.now()-based
  // helper again during its hydration pass (a few ms after this same
  // render) is exactly the kind of thing that causes a hydration
  // mismatch (see the same fix in lib/vet-view.ts).
  const petAgeLabel = ageLabel(pet.pet?.birthDate ?? null);

  return (
    <PetPassport
      tenantName={active.tenantName}
      pet={pet}
      ageLabel={petAgeLabel}
      visits={petVisits}
      vaccinations={petVaccinations}
    />
  );
}
