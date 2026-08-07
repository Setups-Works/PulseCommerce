import { MediaLibrary } from "@/components/admin/media-library";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/services/auth-service";
import { can } from "@/lib/auth/rbac";

export const metadata = { title: "Media library" };

/**
 * Images, video and documents in Supabase Storage.
 *
 * Newest first: the asset someone wants is almost always the one they just
 * uploaded.
 */
export default async function MediaPage() {
  const profile = await requireCapability("content.read");

  const supabase = await createClient();
  const { data } = await supabase
    .from("media")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Media library</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Stored in Supabase Storage and served from a public bucket, because every asset here is
          destined for a public page. Alt text is editable after upload — an empty value is
          meaningful, and marks an image as decorative so a screen reader skips it.
        </p>
      </div>

      <MediaLibrary items={data ?? []} canWrite={can(profile.role, "media.upload")} />
    </div>
  );
}
