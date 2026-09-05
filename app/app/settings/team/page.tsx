import { Card, Pill } from "@/components/ui";
import { InviteForm } from "@/components/team/InviteForm";
import { RemoveMemberButton } from "@/components/team/RemoveMemberButton";
import { ResendInviteButton } from "@/components/team/ResendInviteButton";
import { requireActiveMembership } from "@/lib/tenant";
import { formatDate } from "@/lib/format";

function lastLoginLabel(iso: string | null | undefined): string {
  if (!iso) return "Never signed in";
  const date = new Date(iso);
  const time = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `Last login ${formatDate(date)}, ${time}`;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "owner",
  caregiver: "caregiver",
  viewer: "viewer",
  vet_view: "vet view",
  social: "social",
};

export default async function TeamPage() {
  const { supabase, active } = await requireActiveMembership();

  const [{ data: members }, { data: logins }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, user_id, invited_email, role, status")
      .eq("tenant_id", active.tenantId)
      .neq("status", "removed")
      .order("created_at"),
    supabase.rpc("team_last_logins", { p_tenant_id: active.tenantId }),
  ]);

  const lastLoginByUserId = new Map((logins ?? []).map((l) => [l.user_id, l.last_sign_in_at]));
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
            <div key={m.id} className="flex items-center justify-between py-2.5 text-sm gap-3">
              <div className="min-w-0">
                <div className="truncate">{m.invited_email}</div>
                <div className="text-xs text-muted">
                  {m.status === "invited" ? "Invite not yet accepted" : lastLoginLabel(lastLoginByUserId.get(m.user_id ?? ""))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-none">
                <Pill>{ROLE_LABEL[m.role] ?? m.role}</Pill>
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
            <span>Read-only on everything — for a pet-sitter or co-parent who needs the full picture.</span>
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <span className="text-muted">vet view</span>
            <span>
              Locked to a single read-only page (<code className="text-xs">Vet View</code>) — a mobile-friendly
              one-page summary per pet, meant to be opened by or shown to a vet.
            </span>
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <span className="text-muted">social</span>
            <span>Locked to Pets (read-only cards) and Gallery — can like and comment, but not upload or edit. For family and friends.</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
