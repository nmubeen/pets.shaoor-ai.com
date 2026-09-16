// Resolves the signed-in user's personal Pets account.
import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPetsCommercialAccess } from "@/lib/access/pets-commercial-access";
import type { WorkspaceType } from "@/lib/database.types";
import { ensureAppMembership, membershipError, type AppMembership } from "@/lib/auth/membership";
import { ensurePetsAccountForCurrentUser } from "@/lib/auth/provisioning";

export type ActiveAccount = {
  tenantId: string;
  tenantName: string;
  workspaceType: WorkspaceType;
  planCode: string;
  trialEndsAt: string | null;
};

/** Redirects to /login if there's no signed-in user. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  let membership: AppMembership | null = null;
  let cause: "rpc-failed" | undefined;
  try {
    membership = await ensureAppMembership(supabase);
  } catch {
    cause = "rpc-failed";
  }
  if (membership?.status !== "active") redirect(`/auth/error?reason=${membershipError(membership, cause ?? "missing")}`);
  return { supabase, user };
}

/** Billing and the paused-access page must remain accessible without a subscription. */
export async function requireAccountUnchecked() {
  const { supabase, user } = await requireUser();
  const lookup = () => supabase.from("tenants")
    .select("id, name, workspace_type, plan_code, trial_ends_at")
    .eq("owner_user_id", user.id).maybeSingle();
  let { data: tenant, error } = await lookup();
  if (!error && !tenant && await ensurePetsAccountForCurrentUser(supabase)) {
    ({ data: tenant, error } = await lookup());
  }
  if (error || !tenant) redirect("/auth/access-error");
  const active: ActiveAccount = {
    tenantId: tenant.id,
    tenantName: tenant.name,
    workspaceType: tenant.workspace_type,
    planCode: tenant.plan_code,
    trialEndsAt: tenant.trial_ends_at,
  };
  return { supabase, user, active };
}

export async function requireActiveAccount() {
  const result = await requireAccountUnchecked();
  const access = await getPetsCommercialAccess(result.supabase, result.active.tenantId);
  if (!access.allowed) redirect(`/app/pending?reason=${access.reason ?? "subscription"}`);
  return result;
}
