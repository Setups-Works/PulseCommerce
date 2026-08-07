import { ContentEditor, type FieldSpec } from "@/components/admin/content-editor";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/services/auth-service";
import { can } from "@/lib/auth/rbac";
import type { Tables } from "@/types/database";

export const metadata = { title: "SEO" };

type Row = Tables<"seo_entries">;

/**
 * Field schema for the seo_entries table.
 *
 * Typed against the row, so a column renamed in a migration is a compile error
 * here rather than a field that silently stops saving.
 */
const FIELDS: FieldSpec<Row>[] = [
  { name: "route", label: "Route" },
  { name: "title", label: "Title", wide: true },
  { name: "description", label: "Description", kind: "textarea", wide: true },
  { name: "keywords", label: "Keywords", kind: "list", wide: true, description: "One per line." },
  { name: "canonical_url", label: "Canonical URL", wide: true },
  { name: "og_title", label: "Open Graph title" },
  { name: "og_description", label: "Open Graph description", kind: "textarea", wide: true },
  { name: "robots_index", label: "Allow indexing", kind: "boolean" },
  { name: "robots_follow", label: "Allow following links", kind: "boolean" },
  { name: "include_in_sitemap", label: "Include in sitemap", kind: "boolean" },
  { name: "sitemap_priority", label: "Sitemap priority", kind: "number", description: "0.0 to 1.0." },
  { name: "sitemap_changefreq", label: "Change frequency" },
];

export default async function Page() {
  const profile = await requireCapability("content.read");

  const supabase = await createClient();
  const { data } = await supabase.from("seo_entries").select("*").order("position");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Search and social</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          One row per route. These are the parts that are not derivable from content — titles, canonicals, robots directives, social cards. The structured data on the landing page is generated from the content tables themselves, so it cannot disagree with what a visitor sees.
        </p>
      </div>

      <ContentEditor<Row>
        table="seo_entries"
        rows={data ?? []}
        fields={FIELDS}
        canWrite={can(profile.role, "content.write")}
        titleField="route"
        newRow={{ route: "/new", status: "draft" }}
        addLabel="Add route"
        emptyMessage="No SEO rows yet. Metadata falls back to what each page declares."
      />
    </div>
  );
}
