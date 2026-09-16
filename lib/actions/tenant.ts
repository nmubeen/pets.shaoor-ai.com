"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/errors";
import { sendEmail } from "@/lib/email";
import { emailShell, emailButton } from "@/lib/email-templates";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://pets.shaoor-ai.com").replace(/\/$/, "");

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Column-level grant restricts this to (name, workspace_type) — see 0033_single_user_accounts.sql — and RLS's "tenant isolation - update" policy restricts it to this tenant's owner or an active household member (0036_household_members.sql). */
export async function updateTenantName(tenantId: string, formData: FormData) {
  const name = formData.get("name");
  if (typeof name !== "string" || name.trim().length === 0) return { error: "Household name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("tenants").update({ name: name.trim() }).eq("id", tenantId);
  if (error) return { error: friendlyErrorMessage(error) };

  revalidatePath("/app");
  revalidatePath("/app/settings/care");
  return { error: null };
}

function revalidateHousehold() {
  revalidatePath("/app/settings/care/household");
}

/**
 * Invites someone by email to full, un-restricted access to this
 * household — there's no role to pick, by design (see
 * 0036_household_members.sql). They claim it by simply signing in with
 * that same email (the ordinary email-code flow, lib/auth/actions.ts) —
 * ensure_account() checks for a pending invite before ever creating them
 * their own separate household. If that email already owns (or belongs
 * to) a different household, signing in resolves to that existing one
 * instead and this invite is simply never claimed — there's no
 * multi-household switching, so nothing merges or gets reassigned.
 */
export async function inviteHouseholdMember(tenantId: string, formData: FormData) {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.trim()) return { error: "Email is required." };
  const normalized = email.trim().toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (normalized === user.email?.toLowerCase()) return { error: "That's your own email." };

  const { data: tenant } = await supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle();

  const { error } = await supabase.from("household_members").insert({
    tenant_id: tenantId,
    invited_email: normalized,
    invited_by: user.id,
  });
  if (error) {
    if (error.code === "23505") return { error: "Already invited." };
    return { error: friendlyErrorMessage(error) };
  }

  const loginUrl = `${SITE_URL}/login?email=${encodeURIComponent(normalized)}`;
  await sendEmail({
    to: normalized,
    subject: `You've been invited to ${tenant?.name ?? "a household"} on Shaoor-AI Pets`,
    html: emailShell(
      "You've been invited to a household on Shaoor-AI Pets",
      `<p>You've been invited to <strong>${tenant?.name ?? "a household"}</strong> on Shaoor-AI Pets — full access
       to every pet, visit, and record, same as everyone else there.</p>
       <p>Sign in with this email address (${normalized}) to join, no password needed:</p>
       ${emailButton(loginUrl, "Sign in and join →")}`
    ),
  });

  revalidateHousehold();
  return { error: null };
}

/** Immediately revokes access — RLS re-evaluates on their very next request, there's no session to separately invalidate. */
export async function removeHouseholdMember(tenantId: string, memberId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("household_members").delete().eq("id", memberId).eq("tenant_id", tenantId);
  if (error) return { error: friendlyErrorMessage(error) };

  revalidateHousehold();
  return { error: null };
}
