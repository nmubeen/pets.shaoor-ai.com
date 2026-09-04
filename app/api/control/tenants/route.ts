import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// shaoor-ai.com's admin control plane calls this to resolve a tenant id to
// its display name for the /admin/subscriptions dashboard. Pets lives in
// its own Supabase project, so unlike Chat/Construct (same-database
// schemas the control plane can JOIN directly), this is the only way it
// can show a name for a pets.shaoor-ai.com row — see
// control.product_instances.tenant_organization_id and
// lib/control/product-subscription.service.ts on the shaoor-ai.com side.
// Bearer-secret authenticated (server-to-server, no user session), same
// shape as pets' own cron routes' CRON_SECRET check.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.PETS_CONTROL_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idsParam = request.nextUrl.searchParams.get("ids");
  const ids = (idsParam ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ tenants: [] });

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("tenants").select("id, name, workspace_type").in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    tenants: (data ?? []).map((t) => ({ id: t.id, name: t.name, workspaceType: t.workspace_type })),
  });
}
