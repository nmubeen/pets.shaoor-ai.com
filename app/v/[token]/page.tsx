import { createAdminClient } from "@/lib/supabase/admin";
import { getPetsCommercialAccess } from "@/lib/access/pets-commercial-access";
import { getRoster } from "@/lib/roster";
import { getVisits, getIllnesses, getVaccinations } from "@/lib/health";
import { getMedications } from "@/lib/medications";
import { getWeightHistory } from "@/lib/growth";
import { buildVetSummaries } from "@/lib/vet-view";
import { VetView } from "@/components/vet-view/VetView";

export const metadata = { title: "Pet health summary" };

/**
 * Shown for a token that doesn't resolve to a live link — revoked,
 * mistyped, or never existed, and also a subscription that's since lapsed
 * (indistinguishable from the outside, and none of a vet's business to
 * tell apart) — instead of a bare 404, which reads as "this whole site is
 * broken" rather than "ask the owner for a fresh link".
 */
function InvalidLinkMessage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-paper px-4 text-center">
      <p className="text-lg font-semibold text-(--color-primary-text)">This link is invalid</p>
      <p className="text-sm text-muted max-w-[40ch]">
        This link is no longer active. Please ask the pet owner for a fresh one.
      </p>
    </div>
  );
}

/**
 * A vet's no-login view of one household's read-only Vet View — reached
 * only by an unguessable token (lib/actions/vet-share.ts generates it from
 * /app/vet-view; there's no login here at all, and none of this app's
 * normal tenant/session gating applies to a route outside app/app/). Token
 * possession is the entire authorization boundary, so this reads via the
 * admin (service-role) client rather than a signed-in RLS-bound one — see
 * lib/supabase/admin.ts.
 */
export default async function VetShareLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: link } = await supabase
    .from("vet_share_links")
    .select("tenant_id")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();
  if (!link) return <InvalidLinkMessage />;

  const { data: tenant } = await supabase.from("tenants").select("name").eq("id", link.tenant_id).maybeSingle();
  if (!tenant) return <InvalidLinkMessage />;

  // Checked live, at view time, not just when the link was generated — a
  // household whose subscription has since lapsed stops serving this page
  // at all, even to an already-issued link.
  const access = await getPetsCommercialAccess(supabase, link.tenant_id);
  if (!access.allowed) return <InvalidLinkMessage />;

  const [roster, visits, illnesses, vaccinations, medications, weightHistory] = await Promise.all([
    getRoster(supabase, link.tenant_id),
    getVisits(supabase, link.tenant_id),
    getIllnesses(supabase, link.tenant_id),
    getVaccinations(supabase, link.tenant_id),
    getMedications(supabase, link.tenant_id),
    getWeightHistory(supabase, link.tenant_id),
  ]);

  const pets = roster.filter((r) => r.kind === "pet");
  const summaries = buildVetSummaries(pets, visits, illnesses, vaccinations, medications, weightHistory);

  await supabase.from("vet_share_links").update({ last_viewed_at: new Date().toISOString() }).eq("token", token);

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <VetView tenantName={tenant.name} summaries={summaries} />
      </main>
    </div>
  );
}
