import { ContentEditor, type FieldSpec } from "@/components/admin/content-editor";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/services/auth-service";
import { can } from "@/lib/auth/rbac";
import type { Tables } from "@/types/database";

export const metadata = { title: "Navigation" };

type Row = Tables<"footer_links">;

/**
 * Field schema for the footer_links table.
 *
 * Typed against the row, so a column renamed in a migration is a compile error
 * here rather than a field that silently stops saving.
 */
const FIELDS: FieldSpec<Row>[] = [
  { name: "label", label: "Label" },
  { name: "href", label: "Link" },
  { name: "column_label", label: "Column", description: "Product, Platform, Start…" },
  { name: "opens_in_new_tab", label: "Opens in a new tab", kind: "boolean" },
];

export default async function Page() {
  const profile = await requireCapability("content.read");

  const supabase = await createClient();
  const { data } = await supabase.from("footer_links").select("*").order("position");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Footer links</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Grouped into columns by <code>column_label</code>, in the order the first link of each column appears. The header mega menu lives in the <code>navigation</code> table and is edited separately.
        </p>
      </div>

      <ContentEditor<Row>
        table="footer_links"
        rows={data ?? []}
        fields={FIELDS}
        canWrite={can(profile.role, "content.write")}
        titleField="label"
        newRow={{ label: "New link", href: "/", column_label: "Product", status: "draft" }}
        addLabel="Add link"
        emptyMessage="No footer links yet. The footer falls back to its built-in columns."
      />
    </div>
  );
}
