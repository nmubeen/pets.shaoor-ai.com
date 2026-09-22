import { FeedingPanel } from "@/components/feeding/FeedingPanel";
import { requireActiveAccount } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getFeedingSchedules, getFeedingLogHistory } from "@/lib/feeding";

export default async function FeedingPage() {
  const { supabase, active } = await requireActiveAccount();

  const [roster, schedules, history] = await Promise.all([
    getRoster(supabase, active.tenantId),
    getFeedingSchedules(supabase, active.tenantId),
    getFeedingLogHistory(supabase, active.tenantId),
  ]);

  return <FeedingPanel tenantId={active.tenantId} roster={roster} schedules={schedules} history={history} />;
}
