"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function inviteMember(tenantId: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "caregiver");
  if (!email || !email.includes("@")) return { error: "Enter a valid email." };
  if (role !== "caregiver" && role !== "viewer") return { error: "Invalid role." };

  const supabase = await createClient();
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
