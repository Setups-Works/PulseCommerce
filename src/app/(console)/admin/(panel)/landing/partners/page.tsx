import { ContentEditor, type FieldSpec } from "@/components/admin/content-editor";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/services/auth-service";
import { can } from "@/lib/auth/rbac";
import type { Tables } from "@/types/database";

export const metadata = { title: "Partners" };

type Row = Tables<"partners">;

/**
 * Field schema for the partners table.
 *
 * Typed against the row, so a column renamed in a migration is a compile error
 * here rather than a field that silently stops saving.
 */
const FIELDS: FieldSpec<Row>[] = [
  { name: "name", label: "Name" },
  { name: "icon_slug", label: "Simple-icons slug", description: "woocommerce, stripe, meta…" },
  { name: "href", label: "Link" },
  { name: "category", label: "Category", description: "stack for the works-with band." },
];

export default async function Page() {
  const profile = await requireCapability("content.read");

  const supabase = await createClient();
  const { data } = await supabase.from("partners").select("*").order("position");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Partner and stack logos</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          The works-with band on the landing page. <code>icon_slug</code> is a simple-icons slug — woocommerce, whatsapp, stripe. Marks render monochrome and take their brand colour only on hover, so a row of them does not shout over the page.
        </p>
      </div>

      <ContentEditor<Row>
        table="partners"
        rows={data ?? []}
        fields={FIELDS}
        canWrite={can(profile.role, "content.write")}
        titleField="name"
        newRow={{ name: "New partner", category: "stack", status: "draft" }}
        addLabel="Add partner"
        emptyMessage="No partners yet. The band falls back to the built-in list."
      />
    </div>
  );
}
