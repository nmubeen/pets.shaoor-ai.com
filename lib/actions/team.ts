"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { emailShell, emailButton } from "@/lib/email-templates";
import { enforcePetsLimit, PlanLimitExceededError } from "@/lib/entitlements";

const ROLE_LABEL: Record<string, string> = {
  caregiver: "a caregiver",
  viewer: "a viewer",
  vet_view: "a vet",
  social: "a social member (pet cards & gallery)",
};

// Shared by inviteMember (first send) and resendInvite (a pending invite
// whose email never arrived — see lib/email.ts's soft-fail behavior when
// ZEPTOMAIL_API_TOKEN isn't set, which is exactly what happened here once
// in production).
//
// The primary link goes to /signup?invited=1 rather than /login: an
// invited person very often has no Menagerie account yet, so "sign in"
// is a dead end for them (no password exists) — this was a real bug
// (sumayra1817@gmail.com, 2026-09-04): the invite pointed at /login,
// which she couldn't use, and the page's own "New to Menagerie? Sign up"
// fallback landed on the *generic* signup form, which demands a new
// workspace name and would have created a second, empty household
// instead of joining the one she was actually invited to.
// /signup's invited mode (app/signup/page.tsx) skips the workspace
// fields entirely and signs up with no workspace_name metadata, so
// menagerie.handle_new_user()'s unconditional invite-reconciliation
// step is the *only* thing that fires — she lands directly in the
// workspace she was invited to. The secondary link covers the other
// case (already has a Menagerie account from another workspace).
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
  const signupUrl = `${siteUrl}/signup?invited=1&email=${encodeURIComponent(toEmail)}&tenant=${encodeURIComponent(tenantName ?? "")}`;
  const loginUrl = `${siteUrl}/login?email=${encodeURIComponent(toEmail)}`;
  const { error } = await sendEmail({
    to: toEmail,
    subject: `You've been invited to ${tenantName ?? "a workspace"} on Menagerie`,
    html: emailShell(
      `Join ${tenantName ?? "a workspace"} on Menagerie`,
      `<p>${inviterEmail ? `<strong>${inviterEmail}</strong> invited` : "You've been invited"} you to join
        <strong>${tenantName ?? "their workspace"}</strong> on Menagerie as ${ROLE_LABEL[role] ?? "a member"}.</p>
       <p>Set a password to get started and you'll land right in the workspace.</p>
       ${emailButton(signupUrl, "Set up your account →")}
       <p style="color:#5B6459; font-size:12px; margin-top:16px;">Already have a Menagerie account? <a href="${loginUrl}" style="color:#1F4B3F;">Sign in instead</a>.</p>`
    ),
  });
  return { error, siteUrl, signupUrl };
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
  }, { data: existing }] = await Promise.all([
    supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
    supabase.auth.getUser(),
    supabase.from("memberships").select("id, status").eq("tenant_id", tenantId).eq("invited_email", email).maybeSingle(),
  ]);

  // The unique constraint is on (tenant_id, invited_email) — a *removed*
  // member still occupies that row, so a plain insert would always fail
  // with a unique violation and never let them be invited back. Reactivate
  // the existing row instead (only a genuinely still-active member blocks
  // re-inviting).
  if (existing) {
    if (existing.status === "active") return { error: "That person already has access." };
    const { error: reactivateError } = await supabase
      .from("memberships")
      .update({ role, status: "invited" })
      .eq("id", existing.id);
    if (reactivateError) return { error: reactivateError.message };
  } else {
    const { error: insertError } = await supabase.from("memberships").insert({
      tenant_id: tenantId,
      invited_email: email,
      role,
      status: "invited",
    });
    if (insertError) {
      if (insertError.code === "23505") return { error: "That person already has access." };
      return { error: insertError.message };
    }
  }

  // Best-effort — an invite that fails to notify by email is still a real
  // invite (the membership row exists, they can just sign in/up directly),
  // so a delivery failure here shouldn't fail the whole action. It should,
  // however, actually tell the person who sent it — silently swallowing
  // the error left a real "no email arrived" case looking like success.
  const { error: emailError, signupUrl } = await sendInviteEmail({
    toEmail: email,
    tenantName: tenant?.name,
    inviterEmail: user?.email,
    role,
  });

  revalidatePath("/app/settings/team");
  if (emailError) {
    return {
      error: null,
      warning: `${email} was added, but the invite email couldn't be sent (${emailError}). Share this link with them instead: ${signupUrl}`,
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

  const { error: emailError, signupUrl } = await sendInviteEmail({
    toEmail: membership.invited_email,
    tenantName: tenant?.name,
    inviterEmail: user?.email,
    role: membership.role,
  });

  if (emailError) {
    return { error: `Still couldn't send it (${emailError}). Share this link with them instead: ${signupUrl}` };
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
