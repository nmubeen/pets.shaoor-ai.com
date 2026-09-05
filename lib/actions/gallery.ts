"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getComments, type CommentItem } from "@/lib/gallery";
import { uploadImage, removeImage } from "@/lib/storage";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

type ScopeRow = { pet_id: string | null; habitat_id: string | null };

/** Parses MultiScopePicker's "scope_ids" checkboxes — same shape as lib/actions/shopping.ts's parseMultiScope. */
function parseMultiScope(formData: FormData): ScopeRow[] {
  return formData
    .getAll("scope_ids")
    .filter((v): v is string => typeof v === "string")
    .map((raw): ScopeRow | null => {
      const [kind, id] = raw.split(":");
      if (kind === "pet" && id) return { pet_id: id, habitat_id: null };
      if (kind === "habitat" && id) return { pet_id: null, habitat_id: id };
      return null;
    })
    .filter((v): v is ScopeRow => v !== null);
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

  const { data: media, error } = await supabase
    .from("media")
    .insert({
      tenant_id: tenantId,
      storage_path: path,
      caption: str(formData, "caption"),
      clicked_date: str(formData, "clicked_date") ?? new Date().toISOString().slice(0, 10),
      uploaded_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !media) {
    await removeImage(supabase, path);
    return { error: error?.message ?? "Could not save that photo." };
  }

  const scopeRows = parseMultiScope(formData);
  if (scopeRows.length > 0) {
    const { error: scopeError } = await supabase
      .from("media_scopes")
      .insert(scopeRows.map((s) => ({ tenant_id: tenantId, media_id: media.id, ...s })));
    if (scopeError) return { error: scopeError.message };
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

/** Toggle-on. RLS (menagerie.can_social_interact_tenant()) is what actually enforces who's allowed — owner/caregiver/social; viewer/vet_view get a policy-violation error, which the UI avoids by not rendering the button for them in the first place. */
export async function likeMedia(tenantId: string, mediaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("media_likes").insert({
    tenant_id: tenantId,
    media_id: mediaId,
    user_id: user.id,
  });
  // Already liked (unique constraint) isn't a real error — same end state either way.
  if (error && error.code !== "23505") return { error: error.message };

  revalidatePath("/app/gallery");
  return { error: null };
}

/** Toggle-off — a like is only ever removed by its own owner (RLS also enforces user_id = auth.uid()). */
export async function unlikeMedia(tenantId: string, mediaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("media_likes")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("media_id", mediaId)
    .eq("user_id", user.id);
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
