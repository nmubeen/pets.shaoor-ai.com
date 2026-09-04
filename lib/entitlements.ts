// Plan-limit enforcement — reads menagerie.plans' own limit columns
// (pet_limit/seat_limit/location_limit), which already existed and were
// shown on /app/settings/billing but never actually enforced anywhere.
// Mirrors construct.shaoor-ai.com's enforceConstructNumericLimit() in
// spirit, but reads Pets' own local plan table rather than the shared
// control.plan_entitlements — consistent with each product's local plan
// table being its own enforcement source (see the approved architecture
// plan). A null limit means unlimited (matches how these columns were
// already being used for display).
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
type LimitKind = "pets" | "seats";
const LIMIT_LABEL: Record<LimitKind, string> = { pets: "pets", seats: "team members" };

/** Throws PlanLimitExceededError if adding one more of `kind` would exceed the tenant's plan limit. */
export async function enforcePetsLimit(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  kind: LimitKind,
  currentCount: number
): Promise<void> {
  const { data: tenant } = await supabase.from("tenants").select("plan_code").eq("id", tenantId).maybeSingle();
  if (!tenant) return; // tenant lookup itself will fail elsewhere with a clearer error

  const { data: plan } = await supabase.from("plans").select("pet_limit, seat_limit").eq("code", tenant.plan_code).maybeSingle();
  const limit = kind === "pets" ? plan?.pet_limit ?? null : plan?.seat_limit ?? null;
  if (limit === null) return; // unlimited on this plan

  if (currentCount >= limit) throw new PlanLimitExceededError(LIMIT_LABEL[kind], limit);
}
