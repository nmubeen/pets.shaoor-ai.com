import { redirect } from "next/navigation";
import { requireAccountUnchecked } from "@/lib/tenant";
import { getMyPendingInvite } from "@/lib/household";
import { SwitchHouseholdView } from "@/components/settings/SwitchHouseholdView";

// Deliberately requireAccountUnchecked, not requireActiveAccount — someone
// deciding whether to abandon a lapsed/blocked household for an invited
// one shouldn't be stuck behind the subscription gate to even see this
// choice.
export default async function SwitchHouseholdPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite: inviteId } = await searchParams;
  const { supabase, user, active } = await requireAccountUnchecked();

  const invite = user.email ? await getMyPendingInvite(supabase, user.email) : null;
  // The invite this page was opened for must still be the (or a) pending
  // one for this email — a stale link (already decided, or someone else's
  // invite id) just sends them on to the household they already have.
  if (!invite || invite.id !== inviteId) redirect("/app");

  return (
    <SwitchHouseholdView inviteId={invite.id} currentHouseholdName={active.tenantName} invitedHouseholdName={invite.tenantName} />
  );
}
