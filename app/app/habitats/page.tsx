import { Card } from "@/components/ui";
import { AddRosterPanel } from "@/components/roster/AddRosterPanel";
import { HabitatsGrid } from "@/components/habitats/HabitatsGrid";
import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getHabitatCareByHabitat } from "@/lib/habitat-care";

export default async function HabitatsPage() {
  const { supabase, active } = await requireActiveMembership();
  const [roster, careByHabitat] = await Promise.all([
    getRoster(supabase, active.tenantId),
    getHabitatCareByHabitat(supabase, active.tenantId),
  ]);
  const habitats = roster.filter((r) => r.kind === "habitat");
  const canWrite = active.role === "owner" || active.role === "caregiver";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Habitats</h1>
          <p className="text-sm text-muted">Tanks, cages, hutches — every shared enclosure in this workspace</p>
        </div>
        {canWrite && (
          <AddRosterPanel
            tenantId={active.tenantId}
            triggerLabel="Add habitat"
            fixedKind="habitat"
            triggerClassName="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition"
          />
        )}
      </div>

      {habitats.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          {canWrite ? "No habitats yet — use “Add habitat” above to add your first one." : "No habitats yet."}
        </Card>
      ) : (
        <HabitatsGrid
          tenantId={active.tenantId}
          habitats={habitats}
          canWrite={canWrite}
          careByHabitat={Object.fromEntries(careByHabitat)}
        />
      )}
    </div>
  );
}
