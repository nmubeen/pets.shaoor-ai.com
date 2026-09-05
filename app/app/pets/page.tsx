import { Card } from "@/components/ui";
import { AddRosterPanel } from "@/components/roster/AddRosterPanel";
import { PetsGrid } from "@/components/pets/PetsGrid";
import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getPetLinks } from "@/lib/pet-links";

export default async function PetsPage() {
  const { supabase, active } = await requireActiveMembership();
  const [roster, petLinks] = await Promise.all([
    getRoster(supabase, active.tenantId),
    getPetLinks(supabase, active.tenantId),
  ]);
  const isOrg = active.workspaceType === "organization";
  const pets = roster.filter((r) => r.kind === "pet");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Pets</h1>
          <p className="text-sm text-muted">Every individual pet in this workspace</p>
        </div>
        <AddRosterPanel
          tenantId={active.tenantId}
          triggerLabel="Add pet"
          fixedKind="pet"
          triggerClassName="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition"
        />
      </div>

      {pets.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">No pets yet — use “Add pet” above to add your first one.</Card>
      ) : (
        <PetsGrid tenantId={active.tenantId} pets={pets} isOrg={isOrg} petLinks={Object.fromEntries(petLinks)} />
      )}
    </div>
  );
}
