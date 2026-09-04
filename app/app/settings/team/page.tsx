import { Card, Pill } from "@/components/ui";
import { InviteForm } from "@/components/team/InviteForm";
import { RemoveMemberButton } from "@/components/team/RemoveMemberButton";
import { ResendInviteButton } from "@/components/team/ResendInviteButton";
import { requireActiveMembership } from "@/lib/tenant";

export default async function TeamPage() {
  const { supabase, active } = await requireActiveMembership();

  const { data: members } = await supabase
    .from("memberships")
    .select("id, invited_email, role, status")
    .eq("tenant_id", active.tenantId)
    .neq("status", "removed")
    .order("created_at");

  const isOwner = active.role === "owner";

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl mb-1">Team</h1>
        <p className="text-sm text-muted">Invite the people who help care for these pets</p>
      </div>

      <Card className="p-5">
        <div className="flex flex-col divide-y divide-line mb-5">
          {(members ?? []).map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2.5 text-sm">
              <span>{m.invited_email}</span>
              <div className="flex items-center gap-2">
                <Pill>{m.role}</Pill>
                {m.status === "invited" && <Pill dotColor="var(--accent)">pending</Pill>}
                {isOwner && m.status === "invited" && (
                  <ResendInviteButton tenantId={active.tenantId} membershipId={m.id} />
                )}
                {isOwner && m.role !== "owner" && (
                  <RemoveMemberButton tenantId={active.tenantId} membershipId={m.id} />
                )}
              </div>
            </div>
          ))}
        </div>

        {isOwner ? (
          <InviteForm tenantId={active.tenantId} />
        ) : (
          <p className="text-xs text-muted">Only the workspace owner can invite or remove people.</p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-3">Roles</h2>
        <div className="flex flex-col gap-3 text-sm">
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <span className="text-muted">owner</span>
            <span>Manages billing, can remove any member. One per workspace minimum.</span>
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <span className="text-muted">caregiver</span>
            <span>Full read/write on pets, health, shopping, tasks, and gallery.</span>
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <span className="text-muted">viewer</span>
            <span>Read-only — for a pet-sitter, co-parent, or a vet given temporary access.</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
