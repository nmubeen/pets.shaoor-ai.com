import { ProvidersView } from "@/components/providers/ProvidersView";
import { requireActiveMembership } from "@/lib/tenant";
import { getProviders } from "@/lib/providers";

export default async function ProvidersPage() {
  const { supabase, active } = await requireActiveMembership();
  const providers = await getProviders(supabase, active.tenantId);

  return <ProvidersView tenantId={active.tenantId} providers={providers} />;
}
