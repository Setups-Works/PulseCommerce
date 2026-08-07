"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MEDIA_BUCKET, mediaPublicUrl } from "@/lib/supabase/env";
import { getProfile } from "@/services/auth-service";
import { can } from "@/lib/auth/rbac";
import type { Database } from "@/types/database";

/**
 * The media library.
 *
 * Bytes live in Supabase Storage; a row in `public.media` carries the
 * metadata. The pair is kept consistent by ordering the two operations so the
 * survivable failure is the one that happens:
 *
 *   upload → then insert the row.  A crash between them leaves an orphaned
 *   object: invisible, costs a little space, harmless.
 *
 *   delete the object → then the row. A crash between them leaves a row with
 *   no object, which renders as a broken image on the public site — so the
 *   object goes first and the row is only removed once it is gone.
 *
 * The reverse order in either case produces the bad outcome, which is why this
 * is worth stating rather than leaving to whoever edits it next.
 */

type MediaKind = Database["public"]["Enums"]["media_kind"];

export interface UploadResult {
  ok: boolean;
  error?: string;
  id?: string;
  publicUrl?: string;
}

/** 50 MB, matching the bucket's own limit set in the platform migration. */
const MAX_BYTES = 52_428_800;

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

function kindFor(mime: string): MediaKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

/**
 * A storage path that cannot collide or traverse.
 *
 * Date-prefixed for browsability, random-suffixed so two uploads of
 * `logo.png` are two objects rather than one silently overwriting an asset a
 * live page is already using. The name is stripped to a safe character set
 * because a path is not a filename and `../` in one is a real problem.
 */
function storagePath(filename: string): string {
  const safe = filename
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
  const stamp = new Date().toISOString().slice(0, 7); // YYYY-MM
  const nonce = crypto.randomUUID().slice(0, 8);
  return `${stamp}/${nonce}-${safe}`;
}

export async function uploadMedia(formData: FormData): Promise<UploadResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "You are not signed in." };
  if (!can(profile.role, "media.upload")) {
    return { ok: false, error: "Your role cannot upload media." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file was received." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "That file is larger than the 50 MB limit." };
  }
  if (!ALLOWED.has(file.type)) {
    return { ok: false, error: `${file.type || "That file type"} is not accepted.` };
  }

  const supabase = await createClient();
  const path = storagePath(file.name);

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    // `upsert: false` so a colliding path is an error rather than a silent
    // overwrite. With a random nonce a collision means something is wrong.
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) return { ok: false, error: uploadError.message };

  const { data, error } = await supabase
    .from("media")
    .insert({
      bucket: MEDIA_BUCKET,
      path,
      filename: file.name,
      mime_type: file.type,
      kind: kindFor(file.type),
      size_bytes: file.size,
      uploaded_by: profile.id,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // Roll the object back rather than leaving an object with no row — the
    // library would not show it and nothing would ever clean it up.
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/media");
  return { ok: true, id: data?.id, publicUrl: mediaPublicUrl(path) };
}

export async function deleteMedia(id: string): Promise<{ ok: boolean; error?: string }> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "You are not signed in." };
  if (!can(profile.role, "media.delete")) {
    return { ok: false, error: "Your role cannot delete media." };
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("media")
    .select("bucket, path")
    .eq("id", id)
    .maybeSingle();

  if (!row) return { ok: false, error: "That asset no longer exists." };

  // Object first — see the note at the top of this file.
  const { error: storageError } = await supabase.storage.from(row.bucket).remove([row.path]);
  if (storageError) return { ok: false, error: storageError.message };

  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/media");
  return { ok: true };
}

/** Alt text is an accessibility decision, so it is editable after upload. */
export async function updateMediaAlt(
  id: string,
  altText: string,
): Promise<{ ok: boolean; error?: string }> {
  const profile = await getProfile();
  if (!profile || !can(profile.role, "media.upload")) {
    return { ok: false, error: "Your role cannot edit media." };
  }

  const supabase = await createClient();
  // An empty string is meaningful here — it marks an image as decorative so a
  // screen reader skips it — so it is stored rather than coerced to null.
  const { error } = await supabase.from("media").update({ alt_text: altText }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/media");
  return { ok: true };
}
