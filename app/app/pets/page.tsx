import { Card } from "@/components/ui";
import { AddRosterPanel } from "@/components/roster/AddRosterPanel";
import { RosterGrid } from "@/components/pets/RosterGrid";
import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";

export default async function PetsPage() {
  const { supabase, active } = await requireActiveMembership();
  const roster = await getRoster(supabase, active.tenantId);
  const isOrg = active.workspaceType === "organization";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Pets &amp; habitats</h1>
          <p className="text-sm text-muted">Every individual and habitat in this workspace</p>
        </div>
        <AddRosterPanel
          tenantId={active.tenantId}
          triggerClassName="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition"
        />
      </div>

      {roster.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          No pets or habitats yet — use “Add pet or habitat” above to add your first one.
        </Card>
      ) : (
        <RosterGrid tenantId={active.tenantId} roster={roster} isOrg={isOrg} />
      )}
    </div>
  );
}
