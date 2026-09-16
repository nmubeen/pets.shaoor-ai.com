// Household members — full access, no roles (see
// supabase/migrations/0036_household_members.sql for why there's no role
// column). The owner isn't a row here; this only lists invited/joined
// members alongside the owner.
import "server-only";
import type { createClient } from "@/lib/supabase/server";

export type HouseholdMember = {
  id: string;
  email: string;
  status: "invited" | "active";
  createdAt: string;
};

export async function getHouseholdMembers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<HouseholdMember[]> {
  const { data } = await supabase
    .from("household_members")
    .select("id, invited_email, status, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at");

  return (data ?? []).map((m) => ({
    id: m.id,
    email: m.invited_email,
    status: m.status,
    createdAt: m.created_at,
  }));
}
