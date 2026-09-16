import { requireActiveAccount } from "@/lib/tenant";
import { getProviders } from "@/lib/providers";
import { ProvidersView } from "@/components/providers/ProvidersView";

export default async function ShopsPage() {
  const { supabase, active } = await requireActiveAccount();
  const providers = await getProviders(supabase, active.tenantId, ["offline_shop", "online_shop"]);

  return (
    <ProvidersView
      tenantId={active.tenantId}
      providers={providers}
      categories={["offline_shop", "online_shop"]}
      title="Shopping (Online and Offline)"
      description="Where you shop for your pets — kept here, selected from elsewhere in the app."
    />
  );
}
