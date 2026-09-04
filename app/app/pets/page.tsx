import { Card, Avatar } from "@/components/ui";
import { AddRosterPanel } from "@/components/roster/AddRosterPanel";
import { AdoptionToggle } from "@/components/pets/AdoptionToggle";
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
          <p className="text-sm text-muted">Every individual, group, and habitat in this workspace</p>
        </div>
        <AddRosterPanel
          tenantId={active.tenantId}
          triggerClassName="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roster.map((r) => (
          <Card key={r.id} className="p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <Avatar label={r.initials} color={r.color} />
            </div>
            <div>
              <div className="font-semibold text-base">{r.name}</div>
              <div className="text-xs text-muted mt-0.5">{r.subtitle}</div>
            </div>
            {isOrg && r.kind === "pet" && (
              <div className="border-t border-line pt-3">
                <AdoptionToggle
                  tenantId={active.tenantId}
                  petId={r.id}
                  isAdoptable={r.isAdoptable}
                  adoptionNote={r.adoptionNote}
                />
              </div>
            )}
          </Card>
        ))}
        {roster.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted sm:col-span-2 lg:col-span-3">
            No pets or habitats yet — use “Add pet or habitat” above to add your first one.
          </Card>
        )}
      </div>
    </div>
  );
}
