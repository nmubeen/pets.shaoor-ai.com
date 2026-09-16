// Shared helpers for uploading into the "media" Storage bucket (private,
// {tenant_id}/... path prefix, RLS via menagerie.my_tenant_ids()/
// can_write_tenant() — see supabase/migrations/0006_gallery.sql). Used by
// both gallery photo uploads and roster (pet/habitat) display photos.
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

/**
 * Recursively deletes every object under {tenantId}/ — every avatar,
 * gallery photo, prescription photo, provider logo, product photo, all of
 * it, regardless of which subfolder convention wrote it. Used when a
 * tenant's whole household is being abandoned (lib/actions/tenant.ts's
 * switchToInvitedHousehold) — call this *before* the tenant row itself is
 * deleted: the delete Storage policy checks my_tenant_ids(), which stops
 * including this tenant the moment it's gone, and would then block the
 * cleanup it's meant to do.
 */
export async function removeAllTenantMedia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
) {
  async function collectPaths(prefix: string): Promise<string[]> {
    const { data } = await supabase.storage.from("media").list(prefix, { limit: 1000 });
    if (!data) return [];
    const paths: string[] = [];
    for (const entry of data) {
      const fullPath = `${prefix}/${entry.name}`;
      // A pseudo-folder (no id/metadata of its own) needs recursing into;
      // a real object is ready to delete as-is.
      if (entry.id === null) {
        paths.push(...(await collectPaths(fullPath)));
      } else {
        paths.push(fullPath);
      }
    }
    return paths;
  }

  const paths = await collectPaths(tenantId);
  if (paths.length === 0) return;
  // Storage's remove() takes at most 1000 paths per call.
  for (let i = 0; i < paths.length; i += 1000) {
    await supabase.storage.from("media").remove(paths.slice(i, i + 1000));
  }
}
