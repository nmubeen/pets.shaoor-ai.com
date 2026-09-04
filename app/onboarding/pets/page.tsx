import { AuthShell } from "@/components/marketing/AuthShell";
import { PetChip } from "@/components/ui";
import { AddRosterPanel } from "@/components/roster/AddRosterPanel";
import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { FinishSetupButton } from "@/components/roster/FinishSetupButton";
import { syncSubscriptionToControlPlane } from "@/lib/control-sync";

export default async function OnboardingPetsPage() {
  const { supabase, active } = await requireActiveMembership();
  const roster = await getRoster(supabase, active.tenantId);

  // The first server-rendered page a new workspace always hits — a
  // reliable, one-time-per-visit hook for the initial control-plane sync
  // without touching the client-side signup form. Idempotent and
  // non-blocking (see lib/control-sync.ts), so repeat visits are harmless.
  await syncSubscriptionToControlPlane(active.tenantId, "New workspace signup");

  return (
    <AuthShell
      step={2}
      title="Who lives here?"
      subtitle="Add as many pets and habitats as you like — you can always edit this later."
    >
      <div className="flex flex-col gap-2.5">
        {roster.map((r) => (
          <PetChip
            key={r.id}
            name={r.name}
            sub={r.subtitle}
            color={r.color}
            initials={r.initials}
            photoUrl={r.photoUrl}
          />
        ))}
        <AddRosterPanel
          tenantId={active.tenantId}
          triggerLabel="Add another pet or habitat"
          triggerClassName="flex items-center justify-center gap-2 text-sm text-muted border border-dashed border-line rounded-lg px-3.5 py-3 hover:text-ink hover:border-primary transition"
          compact
        />
      </div>

      <FinishSetupButton />
      <p className="text-xs text-muted text-center mt-3">
        Habitats are peers of individual pets — add a tank the same way
        you&rsquo;d add one animal.
      </p>
    </AuthShell>
  );
}
