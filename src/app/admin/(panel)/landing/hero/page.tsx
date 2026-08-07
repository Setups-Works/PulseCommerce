import { ContentEditor, type FieldSpec } from "@/components/admin/content-editor";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/services/auth-service";
import { can } from "@/lib/auth/rbac";
import type { Tables } from "@/types/database";

export const metadata = { title: "Hero" };

type Row = Tables<"hero_sections">;

/**
 * Field schema for the hero_sections table.
 *
 * Typed against the row, so a column renamed in a migration is a compile error
 * here rather than a field that silently stops saving.
 */
const FIELDS: FieldSpec<Row>[] = [
  { name: "route", label: "Route", description: "/, /features, /pricing…" },
  { name: "eyebrow", label: "Eyebrow" },
  { name: "headline", label: "Headline", wide: true, description: "Text before the gradient words." },
  { name: "headline_accent", label: "Accent words", description: "These carry the gradient." },
  { name: "headline_after", label: "Headline, after" },
  { name: "subheadline", label: "Sub-headline", kind: "textarea", wide: true },
  { name: "primary_cta_label", label: "Primary button" },
  { name: "primary_cta_href", label: "Primary link" },
  { name: "secondary_cta_label", label: "Secondary button" },
  { name: "secondary_cta_href", label: "Secondary link" },
  { name: "trust_points", label: "Trust points", kind: "list", wide: true, description: "One per line." },
];

export default async function Page() {
  const profile = await requireCapability("content.read");

  const supabase = await createClient();
  const { data } = await supabase.from("hero_sections").select("*").order("position");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Page heroes</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          One hero per route. The accent words carry the gradient — keep them to two or three; an entire headline in gradient is one nobody reads at a glance. Trust points are the small reassurance chips under the buttons.
        </p>
      </div>

      <ContentEditor<Row>
        table="hero_sections"
        rows={data ?? []}
        fields={FIELDS}
        canWrite={can(profile.role, "content.write")}
        titleField="route"
        newRow={{ route: "/new", headline: "Headline", status: "draft" }}
        addLabel="Add hero"
        emptyMessage="No heroes yet. Every page falls back to its built-in copy."
      />
    </div>
  );
}
