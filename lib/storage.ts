// Shared helpers for uploading into the "media" Storage bucket (private,
// {tenant_id}/... path prefix, RLS via menagerie.my_tenant_ids()/
// can_write_tenant() — see supabase/migrations/0006_gallery.sql). Used by
// both gallery photo uploads and roster (pet/group/habitat) display photos.
import "server-only";
import type { createClient } from "@/lib/supabase/server";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function extFor(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/")[1] ?? "bin";
}

export function validateImage(file: File): string | null {
  if (file.size === 0) return "Choose a photo to upload.";
  if (file.size > MAX_IMAGE_BYTES) return "Photo is too large (max 8MB).";
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return "Only JPEG, PNG, WebP, or GIF photos are supported.";
  return null;
}

/** Uploads under {tenantId}/{subfolder}/{random}.{ext}, returns the storage path. */
export async function uploadImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  subfolder: string,
  file: File
): Promise<{ path: string | null; error: string | null }> {
  const invalid = validateImage(file);
  if (invalid) return { path: null, error: invalid };

  const path = `${tenantId}/${subfolder}/${crypto.randomUUID()}.${extFor(file)}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (error) return { path: null, error: error.message };
  return { path, error: null };
}

export async function removeImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null | undefined
) {
  if (!path) return;
  await supabase.storage.from("media").remove([path]);
}
