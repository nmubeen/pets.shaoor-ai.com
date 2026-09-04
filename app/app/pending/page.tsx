import { redirect } from "next/navigation";
import { Card, Btn, Eyebrow } from "@/components/ui";
import { requireMembershipUnchecked } from "@/lib/tenant";
import { getPetsCommercialAccess } from "@/lib/access/pets-commercial-access";

// Landing spot for a workspace whose subscription doesn't currently allow
// access — mirrors construct.shaoor-ai.com's /account/pending. Reachable
// even while blocked (uses the unchecked membership lookup, not the gated
// one, or this page would redirect to itself).
export default async function PendingPage() {
  const { supabase, active } = await requireMembershipUnchecked();

  // If access has since been restored (e.g. the admin just reactivated the
  // subscription, or a trial isn't actually expired), just send them in —
  // this page shouldn't become a dead end.
  const access = await getPetsCommercialAccess(supabase, active.tenantId);
  if (access.allowed) redirect("/app");

  const isOwner = active.role === "owner";

  return (
    <div className="flex items-center justify-center py-16">
      <Card className="max-w-md w-full p-8 text-center">
        <Eyebrow>{active.tenantName}</Eyebrow>
        <h1 className="text-2xl mb-3">Access paused</h1>
        <p className="text-sm text-muted mb-6">
          {isOwner
            ? "Your subscription for this workspace isn't currently active, so it's temporarily paused. Renew or choose a plan to get back in."
            : "This workspace's subscription isn't currently active, so it's temporarily paused. Ask the workspace owner to renew or choose a plan."}
        </p>
        {isOwner ? (
          <Btn href="/app/settings/billing">Manage billing →</Btn>
        ) : (
          <Btn href="/login" variant="ghost">
            Sign in as a different account
          </Btn>
        )}
      </Card>
    </div>
  );
}
