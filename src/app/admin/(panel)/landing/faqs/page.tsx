import { FaqEditor } from "@/components/admin/faq-editor";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/services/auth-service";
import { can } from "@/lib/auth/rbac";

export const metadata = { title: "FAQ" };

/**
 * The FAQ CMS screen.
 *
 * Reads every row including drafts — staff policies allow that, where the anon
 * key sees only published ones. `content.read` is the gate to open the screen;
 * `content.write` decides whether the controls inside it are live, which is
 * why the capability is passed down rather than re-derived in the client.
 */
export default async function AdminFaqPage() {
  const profile = await requireCapability("content.read");

  const supabase = await createClient();
  const { data } = await supabase.from("faqs").select("*").order("position");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Frequently asked questions</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Published answers appear on the pricing page, and on the landing page when
          &ldquo;show on the landing page&rdquo; is on. The same rows feed the FAQ structured
          data, so what a search engine reads can never disagree with what a visitor sees.
        </p>
      </div>

      <FaqEditor rows={data ?? []} canWrite={can(profile.role, "content.write")} />
    </div>
  );
}
