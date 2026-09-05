import { GalleryView } from "@/components/gallery/GalleryView";
import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getMediaItems } from "@/lib/gallery";

export default async function GalleryPage() {
  const { supabase, active } = await requireActiveMembership();

  const [roster, media] = await Promise.all([
    getRoster(supabase, active.tenantId),
    getMediaItems(supabase, active.tenantId),
  ]);

  return <GalleryView tenantId={active.tenantId} role={active.role} roster={roster} media={media} />;
}
