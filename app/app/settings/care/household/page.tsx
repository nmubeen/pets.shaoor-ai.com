import { requireActiveAccount } from "@/lib/tenant";
import { getHouseholdMembers } from "@/lib/household";
import { HouseholdView } from "@/components/settings/HouseholdView";

export default async function HouseholdSettingsPage() {
  const { supabase, active } = await requireActiveAccount();
  const members = await getHouseholdMembers(supabase, active.tenantId);

  return <HouseholdView tenantId={active.tenantId} name={active.tenantName} members={members} />;
}
