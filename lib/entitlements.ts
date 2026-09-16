import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export class PlanLimitExceededError extends Error {
  constructor(public readonly limitLabel: string, public readonly limit: number) {
    super(`This workspace's plan allows up to ${limit} ${limitLabel}. Upgrade to add more.`);
    this.name = "PlanLimitExceededError";
  }
}

// "locations" (menagerie.plans.location_limit) isn't enforced here: Pets
// has no location/site entity in its schema today (habitats are
// enclosures *within* one location, not separate sites) — the billing
// page displays it as a fixed "1 of X" for the same reason. Nothing to
// count against yet.
/** Throws PlanLimitExceededError if adding one more pet would exceed the tenant's plan limit. */
export async function enforcePetsLimit(
  supabase: SupabaseClient<Database, "menagerie">,
  tenantId: string,
  currentCount: number
): Promise<void> {
  const { data: tenant } = await supabase.from("tenants").select("plan_code").eq("id", tenantId).maybeSingle();
  if (!tenant) return; // tenant lookup itself will fail elsewhere with a clearer error

  const { data: plan } = await supabase.from("plans").select("pet_limit").eq("code", tenant.plan_code).maybeSingle();
  const limit = plan?.pet_limit ?? null;
  if (limit === null) return; // unlimited on this plan

  if (currentCount >= limit) throw new PlanLimitExceededError("pets", limit);
}
