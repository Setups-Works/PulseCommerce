import { ContentEditor, type FieldSpec } from "@/components/admin/content-editor";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/services/auth-service";
import { can } from "@/lib/auth/rbac";
import type { Tables } from "@/types/database";

export const metadata = { title: "Testimonials" };

type Row = Tables<"testimonials">;

/**
 * Field schema for the testimonials table.
 *
 * Typed against the row, so a column renamed in a migration is a compile error
 * here rather than a field that silently stops saving.
 */
const FIELDS: FieldSpec<Row>[] = [
  { name: "quote", label: "Quote", kind: "textarea", wide: true, description: "The words themselves." },
  { name: "author_role", label: "Role", description: "Founder, Head of growth, and so on." },
  { name: "author_context", label: "Store type", description: "Home & living store, supplements brand…" },
  { name: "author_name", label: "Name (optional)", description: "Only with written permission." },
  { name: "company", label: "Company (optional)", description: "Only with written permission." },
  { name: "is_verified", label: "Verified as real and permitted", kind: "boolean", wide: true },
];

export default async function Page() {
  const profile = await requireCapability("content.read");

  const supabase = await createClient();
  const { data } = await supabase.from("testimonials").select("*").order("position");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Testimonials</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Quotes are attributed by role and store type. Leave <code>author_name</code> and <code>company</code> empty unless you have written permission to use them, and only tick <em>verified</em> once you have confirmed the quote is real. Unpublished quotes do not render at all — the section disappears rather than showing placeholders.
        </p>
      </div>

      <ContentEditor<Row>
        table="testimonials"
        rows={data ?? []}
        fields={FIELDS}
        canWrite={can(profile.role, "content.write")}
        titleField="author_role"
        newRow={{ quote: "", author_role: "Founder", status: "draft", is_verified: false }}
        addLabel="Add quote"
        emptyMessage="No quotes yet. The testimonials section does not render until at least one is published."
      />
    </div>
  );
}
