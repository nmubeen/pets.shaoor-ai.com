import { Card } from "@/components/ui";
import { AddRosterPanel } from "@/components/roster/AddRosterPanel";
import { PetsGrid } from "@/components/pets/PetsGrid";
import { PetSummaryCards } from "@/components/pets/PetSummaryCards";
import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getPetLinks } from "@/lib/pet-links";

export default async function PetsPage() {
  const { supabase, active } = await requireActiveMembership();
  const roster = await getRoster(supabase, active.tenantId);
  const pets = roster.filter((r) => r.kind === "pet");

  // Social is read-only here — no Edit/Delete, no Health quick-links, no
  // Add button — so there's no need for petLinks or the org/adoption bits
  // PetsGrid carries; a plain card grid (shared with /app/vet-view's own
  // pet chooser) is both simpler and the actual point of the role.
  if (active.role === "social") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl mb-1">Pets</h1>
          <p className="text-sm text-muted">Every individual pet in this workspace</p>
        </div>
        {pets.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted">No pets yet.</Card>
        ) : (
          <PetSummaryCards pets={pets} />
        )}
      </div>
    );
  }

  const petLinks = await getPetLinks(supabase, active.tenantId);
  const isOrg = active.workspaceType === "organization";

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
