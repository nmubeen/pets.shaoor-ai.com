"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { emailShell, emailButton } from "@/lib/email-templates";

const ROLE_LABEL: Record<string, string> = { caregiver: "a caregiver", viewer: "a viewer" };

export async function inviteMember(tenantId: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "caregiver");
  if (!email || !email.includes("@")) return { error: "Enter a valid email." };
  if (role !== "caregiver" && role !== "viewer") return { error: "Invalid role." };

  const supabase = await createClient();

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
  // so a delivery failure here shouldn't fail the whole action.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pets.shaoor-ai.com";
  await sendEmail({
    to: email,
    subject: `You've been invited to ${tenant?.name ?? "a workspace"} on Menagerie`,
    html: emailShell(
      `Join ${tenant?.name ?? "a workspace"} on Menagerie`,
      `<p>${user?.email ? `<strong>${user.email}</strong> invited` : "You've been invited"} you to join
        <strong>${tenant?.name ?? "their workspace"}</strong> on Menagerie as ${ROLE_LABEL[role] ?? "a member"}.</p>
       <p>Sign in with this email address (or create an account with it, if you're new) and you'll land right in the workspace.</p>
       ${emailButton(`${siteUrl}/login`, "Sign in →")}
       <p style="color:#5B6459; font-size:12px; margin-top:16px;">New to Menagerie? Use <a href="${siteUrl}/signup" style="color:#1F4B3F;">the same email</a> to sign up instead.</p>`
    ),
  });

  revalidatePath("/app/settings/team");
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
