"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseScopeOptional } from "@/lib/scope";
import { getComments, type CommentItem } from "@/lib/gallery";
import { uploadImage, removeImage } from "@/lib/storage";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

export async function uploadMedia(tenantId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a photo to upload." };

  const supabase = await createClient();
  const { path, error: uploadError } = await uploadImage(supabase, tenantId, "gallery", file);
  if (uploadError || !path) return { error: uploadError ?? "Upload failed." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("media").insert({
    tenant_id: tenantId,
    storage_path: path,
    caption: str(formData, "caption"),
    uploaded_by: user?.id ?? null,
    ...parseScopeOptional(str(formData, "scope")),
  });
  if (error) {
    await removeImage(supabase, path);
    return { error: error.message };
  }

  revalidatePath("/app/gallery");
  return { error: null };
}

export async function deleteMedia(tenantId: string, mediaId: string) {
  const supabase = await createClient();

  const { data: media } = await supabase
    .from("media")
    .select("storage_path")
    .eq("id", mediaId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!media) return { error: "Not found." };

  const { error } = await supabase.from("media").delete().eq("id", mediaId).eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  await removeImage(supabase, media.storage_path);

  revalidatePath("/app/gallery");
  return { error: null };
}

export async function fetchComments(tenantId: string, mediaId: string): Promise<CommentItem[]> {
  const supabase = await createClient();
  return getComments(supabase, tenantId, mediaId);
}

export async function addComment(tenantId: string, mediaId: string, formData: FormData) {
  const body = str(formData, "body");
  if (!body) return { error: "Write something first." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("comments").insert({
    tenant_id: tenantId,
    media_id: mediaId,
    author_id: user?.id ?? null,
    body,
  });
  if (error) return { error: error.message };

  revalidatePath("/app/gallery");
  return { error: null };
}

export async function setAdoptable(tenantId: string, petId: string, isAdoptable: boolean, adoptionNote: string | null) {
  const supabase = await createClient();

  const { data: tenant } = await supabase.from("tenants").select("workspace_type").eq("id", tenantId).maybeSingle();
  if (tenant?.workspace_type !== "organization") {
    return { error: "Public adoption profiles are only available for Rescue & Shelter workspaces." };
  }

  const { error } = await supabase
    .from("pets")
    .update({ is_adoptable: isAdoptable, adoption_note: adoptionNote })
    .eq("id", petId)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  revalidatePath("/app/pets");
  return { error: null };
}
