import { ContentEditor, type FieldSpec } from "@/components/admin/content-editor";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/services/auth-service";
import { can } from "@/lib/auth/rbac";
import type { Tables } from "@/types/database";

export const metadata = { title: "Features" };

type Row = Tables<"features">;

/**
 * Field schema for the features table.
 *
 * Typed against the row, so a column renamed in a migration is a compile error
 * here rather than a field that silently stops saving.
 */
const FIELDS: FieldSpec<Row>[] = [
  { name: "title", label: "Title" },
  { name: "description", label: "Description", kind: "textarea", wide: true },
  { name: "collection", label: "Collection", description: "modules or enterprise." },
  { name: "icon", label: "Icon", description: "A lucide icon name, e.g. BarChart3." },
  { name: "metric", label: "Figure", kind: "number", description: "Optional number shown on the card." },
  { name: "metric_unit", label: "Figure unit", description: "e.g. segments, templates." },
  { name: "href", label: "Link" },
  { name: "cta_label", label: "Link label" },
];

export default async function Page() {
  const profile = await requireCapability("content.read");

  const supabase = await createClient();
  const { data } = await supabase.from("features").select("*").order("position");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Features and modules</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Two collections feed different sections: <code>modules</code> is the thirteen-module grid, <code>enterprise</code> is the detail grid lower down. The icon is a lucide name, resolved against an allow-list on the client — storing a name rather than markup keeps arbitrary SVG out of the page.
        </p>
      </div>

      <ContentEditor<Row>
        table="features"
        rows={data ?? []}
        fields={FIELDS}
        canWrite={can(profile.role, "content.write")}
        titleField="title"
        newRow={{ title: "New feature", description: "", collection: "modules", status: "draft" }}
        addLabel="Add feature"
        emptyMessage="No features yet. The public pages fall back to the built-in list."
      />
    </div>
  );
}
