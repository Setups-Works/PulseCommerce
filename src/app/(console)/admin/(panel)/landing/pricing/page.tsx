import { ContentEditor, type FieldSpec } from "@/components/admin/content-editor";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/services/auth-service";
import { can } from "@/lib/auth/rbac";
import type { Tables } from "@/types/database";

export const metadata = { title: "Pricing" };

type Row = Tables<"pricing_plans">;

/**
 * Field schema for the pricing_plans table.
 *
 * Typed against the row, so a column renamed in a migration is a compile error
 * here rather than a field that silently stops saving.
 */
const FIELDS: FieldSpec<Row>[] = [
  { name: "name", label: "Name" },
  { name: "slug", label: "Slug", description: "Entitlements are keyed to this. Renaming breaks them." },
  { name: "blurb", label: "Blurb", kind: "textarea", wide: true },
  { name: "amount", label: "Amount", kind: "number", description: "Leave empty for a free tier." },
  { name: "currency", label: "Currency" },
  { name: "cadence", label: "Cadence", description: "per month, forever…" },
  { name: "price_label", label: "Price label", description: "Shown when there is no amount." },
  { name: "cta_label", label: "Button label" },
  { name: "cta_href", label: "Button link" },
  { name: "limits", label: "Limits", kind: "list", wide: true, description: "One per line." },
  { name: "is_highlighted", label: "Recommended tier", kind: "boolean", wide: true },
];

export default async function Page() {
  const profile = await requireCapability("content.read");

  const supabase = await createClient();
  const { data } = await supabase.from("pricing_plans").select("*").order("position");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Pricing tiers</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Amounts are stored as a number and a currency, not a formatted string, so they can be compared and localised — the page formats them. Leave the amount empty and set a price label instead for a free or self-hosted tier. Changing a slug breaks the entitlements row that points at it.
        </p>
      </div>

      <ContentEditor<Row>
        table="pricing_plans"
        rows={data ?? []}
        fields={FIELDS}
        canWrite={can(profile.role, "content.write")}
        titleField="name"
        newRow={{ name: "New plan", slug: "new-plan", currency: "INR", cadence: "per month", status: "draft" }}
        addLabel="Add tier"
        emptyMessage="No tiers yet. Pricing falls back to the built-in list."
      />
    </div>
  );
}
