import { requireActiveAccount } from "@/lib/tenant";
import { getProviders } from "@/lib/providers";
import { ProvidersView } from "@/components/providers/ProvidersView";

export default async function HospitalsPage() {
  const { supabase, active } = await requireActiveAccount();
  const providers = await getProviders(supabase, active.tenantId, ["vet", "grooming"]);

  return (
    <ProvidersView
      tenantId={active.tenantId}
      providers={providers}
      categories={["vet", "grooming"]}
      title="Hospitals & Grooming Centers"
      description="Vets and groomers — kept here, selected from elsewhere in the app."
    />
  );
}
