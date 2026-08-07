import { Card, Chip } from "@heroui/react";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/services/auth-service";

export const metadata = { title: "Audit log" };

/**
 * Who changed what, and when.
 *
 * Append-only by policy — there is an insert policy and a select policy on
 * audit_logs and deliberately no update or delete, so a record cannot be
 * edited after the fact even by an admin. That is the only property that makes
 * an audit log worth having.
 *
 * Capped at 200 rows. This is a "what happened recently" screen, not an
 * archive, and an unbounded query against a table that only ever grows is a
 * page that gets slower every week.
 */
export default async function AuditLogPage() {
  await requireCapability("audit.read");

  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, entity, entity_id, actor_email, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Audit log</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Every content change, most recent first. Records are append-only: there is no update or
          delete policy on this table, so an entry cannot be altered after it is written.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">
            Nothing recorded yet. Edits made in the admin panel appear here.
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-border p-0">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-4">
              <Chip size="sm" color={chipColour(row.action)}>
                {row.action}
              </Chip>
              <span className="text-sm font-medium">{row.entity}</span>
              {row.entity_id ? (
                <span className="font-mono text-xs text-muted">{row.entity_id.slice(0, 8)}</span>
              ) : null}
              <span className="ml-auto text-xs text-muted">
                {row.actor_email ?? "Unknown"} ·{" "}
                {new Date(row.created_at).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

/** Destructive actions read differently at a glance from routine ones. */
function chipColour(action: string): "success" | "danger" | "warning" | "default" {
  if (action === "deleted") return "danger";
  if (action === "published") return "success";
  if (action === "created") return "warning";
  return "default";
}
