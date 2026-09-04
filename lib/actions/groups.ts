"use server";

// Server Actions for groups — a saved, named collection of 2+ existing
// pets (not a peer roster entity anymore, see lib/roster.ts and
// supabase/migrations/0015_groups_redesign.sql). Membership is replaced
// wholesale on every save (delete-all-then-insert-selected) rather than
// diffed — simpler, and cheap at this app's scale.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadImage, removeImage } from "@/lib/storage";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function petIds(formData: FormData): string[] {
  return formData.getAll("pet_ids").filter((v): v is string => typeof v === "string" && v.length > 0);
}

function revalidateGroups() {
  revalidatePath("/app/pets");
}

async function resolvePhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  formData: FormData,
  currentPath: string | null
): Promise<{ photo_path?: string | null } | { error: string }> {
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const { path, error } = await uploadImage(supabase, tenantId, "avatars", file);
    if (error || !path) return { error: error ?? "Photo upload failed." };
    await removeImage(supabase, currentPath);
    return { photo_path: path };
  }
  if (str(formData, "remove_photo") === "on" && currentPath) {
    await removeImage(supabase, currentPath);
    return { photo_path: null };
  }
  return {};
}

export async function createGroup(tenantId: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };
  const members = petIds(formData);
  if (members.length < 2) return { error: "Choose at least 2 pets for this group." };

  const supabase = await createClient();
  const photo = await resolvePhoto(supabase, tenantId, formData, null);
  if ("error" in photo) return photo;

  const { data: group, error } = await supabase
    .from("pet_groups")
    .insert({ tenant_id: tenantId, name, ...photo })
    .select("id")
    .single();
  if (error || !group) return { error: error?.message ?? "Could not create group." };

  const { error: memberError } = await supabase
    .from("pet_group_members")
    .insert(members.map((petId) => ({ tenant_id: tenantId, group_id: group.id, pet_id: petId })));
  if (memberError) return { error: memberError.message };

  revalidateGroups();
  return { error: null };
}

export async function updateGroup(tenantId: string, groupId: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };
  const members = petIds(formData);
  if (members.length < 2) return { error: "Choose at least 2 pets for this group." };

  const supabase = await createClient();
  const photo = await resolvePhoto(supabase, tenantId, formData, str(formData, "current_photo_path"));
  if ("error" in photo) return photo;

  const { error } = await supabase
    .from("pet_groups")
    .update({ name, ...photo })
    .eq("id", groupId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  const { error: deleteError } = await supabase
    .from("pet_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("tenant_id", tenantId);
  if (deleteError) return { error: deleteError.message };

  const { error: memberError } = await supabase
    .from("pet_group_members")
    .insert(members.map((petId) => ({ tenant_id: tenantId, group_id: groupId, pet_id: petId })));
  if (memberError) return { error: memberError.message };

  revalidateGroups();
  return { error: null };
}

export async function deleteGroup(tenantId: string, groupId: string) {
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("pet_groups")
    .select("photo_path")
    .eq("id", groupId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  // Membership rows cascade at the DB level, so this delete alone is
  // enough — no separate media/scoped records to clean up (groups were
  // never a scope target).
  const { error } = await supabase.from("pet_groups").delete().eq("id", groupId).eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  await removeImage(supabase, group?.photo_path ?? null);

  revalidateGroups();
  return { error: null };
}
