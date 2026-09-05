"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { emailShell, emailButton } from "@/lib/email-templates";
import { enforcePetsLimit, PlanLimitExceededError } from "@/lib/entitlements";

const ROLE_LABEL: Record<string, string> = {
  caregiver: "a caregiver",
  viewer: "a viewer",
  vet_view: "a vet (read-only Vet View)",
  social: "a social member (pet cards & gallery)",
};

// Shared by inviteMember (first send) and resendInvite (a pending invite
// whose email never arrived — see lib/email.ts's soft-fail behavior when
// ZEPTOMAIL_API_TOKEN isn't set, which is exactly what happened here once
// in production).
async function sendInviteEmail({
  toEmail,
  tenantName,
  inviterEmail,
  role,
}: {
  toEmail: string;
  tenantName: string | null | undefined;
  inviterEmail: string | null | undefined;
  role: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pets.shaoor-ai.com";
  const { error } = await sendEmail({
    to: toEmail,
    subject: `You've been invited to ${tenantName ?? "a workspace"} on Menagerie`,
    html: emailShell(
      `Join ${tenantName ?? "a workspace"} on Menagerie`,
      `<p>${inviterEmail ? `<strong>${inviterEmail}</strong> invited` : "You've been invited"} you to join
        <strong>${tenantName ?? "their workspace"}</strong> on Menagerie as ${ROLE_LABEL[role] ?? "a member"}.</p>
       <p>Sign in with this email address (or create an account with it, if you're new) and you'll land right in the workspace.</p>
       ${emailButton(`${siteUrl}/login`, "Sign in →")}
       <p style="color:#5B6459; font-size:12px; margin-top:16px;">New to Menagerie? Use <a href="${siteUrl}/signup" style="color:#1F4B3F;">the same email</a> to sign up instead.</p>`
    ),
  });
  return { error, siteUrl };
}

export async function inviteMember(tenantId: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "caregiver");
  if (!email || !email.includes("@")) return { error: "Enter a valid email." };
  if (role !== "caregiver" && role !== "viewer" && role !== "vet_view" && role !== "social") {
    return { error: "Invalid role." };
  }

  const supabase = await createClient();

  try {
    const { count } = await supabase.from("memberships").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", ["active", "invited"]);
    await enforcePetsLimit(supabase, tenantId, "seats", count ?? 0);
  } catch (err) {
    if (err instanceof PlanLimitExceededError) return { error: err.message };
    throw err;
  }

  const [{ data: tenant }, {
    data: { user },
  }] = await Promise.all([
    supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const { error } = await supabase.from("memberships").insert({
    tenant_id: tenantId,
    invited_email: email,
    role,
    status: "invited",
  });

  if (error) {
    // Unique violation on (tenant_id, invited_email) means they're already a member.
    if (error.code === "23505") return { error: "That person already has access." };
    return { error: error.message };
  }

  // Best-effort — an invite that fails to notify by email is still a real
  // invite (the membership row exists, they can just sign in/up directly),
  // so a delivery failure here shouldn't fail the whole action. It should,
  // however, actually tell the person who sent it — silently swallowing
  // the error left a real "no email arrived" case looking like success.
  const { error: emailError, siteUrl } = await sendInviteEmail({
    toEmail: email,
    tenantName: tenant?.name,
    inviterEmail: user?.email,
    role,
  });

  revalidatePath("/app/settings/team");
  if (emailError) {
    return {
      error: null,
      warning: `${email} was added, but the invite email couldn't be sent (${emailError}). Ask them to sign up at ${siteUrl}/signup with this email address instead.`,
    };
  }
  return { error: null, warning: null };
}

export async function resendInvite(tenantId: string, membershipId: string) {
  const supabase = await createClient();

  const [{ data: membership }, { data: tenant }, {
    data: { user },
  }] = await Promise.all([
    supabase.from("memberships").select("invited_email, role, status").eq("id", membershipId).eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!membership || membership.status !== "invited" || !membership.invited_email) {
    return { error: "That invite is no longer pending." };
  }

  const { error: emailError, siteUrl } = await sendInviteEmail({
    toEmail: membership.invited_email,
    tenantName: tenant?.name,
    inviterEmail: user?.email,
    role: membership.role,
  });

  if (emailError) {
    return { error: `Still couldn't send it (${emailError}). Ask them to sign up at ${siteUrl}/signup with this email address instead.` };
  }
  return { error: null };
}

export async function removeMember(tenantId: string, membershipId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("memberships")
    .update({ status: "removed" })
    .eq("id", membershipId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidatePath("/app/settings/team");
  return { error: null };
}
