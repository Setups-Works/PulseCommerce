"use client";

import * as React from "react";
import { Alert, Button, Card, Chip, Spinner, Switch } from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowUp,
  faFloppyDisk,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { Field } from "@/components/ui-hero/field";
import {
  createContentRow,
  deleteContentRow,
  moveContentRow,
  setContentStatus,
  updateContentRow,
  type ContentTable,
} from "@/services/content-admin-service";
import { cn } from "@/lib/utils";

/**
 * A schema-driven editor for any content table.
 *
 * Eight sections need the same screen — a list of rows, each with a few
 * fields, a publish switch, reorder arrows and a delete. Writing eight of
 * those by hand would be eight places for the publish semantics or the dirty
 * check to drift. Each section instead supplies a field schema, and this
 * renders it.
 *
 * The generic is over the shape of a row rather than a specific table, so a
 * screen gets type checking on its own columns while this file stays agnostic.
 *
 * Editing happens in place rather than in a modal, for the same reason the FAQ
 * editor does: an editor scans a list and tweaks a few rows, and a dialog per
 * row turns that into open-edit-save-close, repeatedly.
 */

export type FieldKind = "text" | "textarea" | "number" | "boolean" | "list";

export interface FieldSpec<T> {
  /** Column name. Typed against the row so a rename breaks the build. */
  name: keyof T & string;
  label: string;
  kind?: FieldKind;
  description?: string;
  placeholder?: string;
  /** Renders full width in the two-column grid. */
  wide?: boolean;
}

export interface ContentEditorProps<T extends { id: string; status: string; position: number }> {
  table: ContentTable;
  rows: T[];
  fields: FieldSpec<T>[];
  canWrite: boolean;
  /** Column used as the row's heading in the list. */
  titleField: keyof T & string;
  /** Values for a newly created row. */
  newRow: Record<string, unknown>;
  addLabel?: string;
  emptyMessage?: string;
}

export function ContentEditor<T extends { id: string; status: string; position: number }>({
  table,
  rows,
  fields,
  canWrite,
  titleField,
  newRow,
  addLabel = "Add",
  emptyMessage = "Nothing here yet.",
}: ContentEditorProps<T>) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const run = React.useCallback(
    (action: () => Promise<{ ok: boolean; error?: string }>) => {
      setError(null);
      startTransition(async () => {
        const result = await action();
        if (!result.ok) setError(result.error ?? "That did not save.");
      });
    },
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      {!canWrite ? (
        <Alert status="default">
          <Alert.Description className="text-sm">
            You have read-only access. Ask an editor or an admin to make changes.
          </Alert.Description>
        </Alert>
      ) : null}

      {error ? (
        <Alert status="danger">
          <Alert.Description className="text-sm">{error}</Alert.Description>
        </Alert>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {rows.length} item{rows.length === 1 ? "" : "s"} ·{" "}
          {rows.filter((r) => r.status === "published").length} published
        </p>
        <Button
          variant="primary"
          size="sm"
          isDisabled={!canWrite || pending}
          onPress={() =>
            // Appended, so adding one does not renumber a list an editor has
            // already put in order.
            run(() => createContentRow(table, { ...newRow, position: rows.length }))
          }
        >
          <FontAwesomeIcon icon={faPlus} className="w-3" />
          {addLabel}
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">{emptyMessage}</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <ContentRow
              key={row.id}
              table={table}
              row={row}
              fields={fields}
              titleField={titleField}
              canWrite={canWrite}
              pending={pending}
              isFirst={index === 0}
              isLast={index === rows.length - 1}
              run={run}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ContentRow<T extends { id: string; status: string; position: number }>({
  table,
  row,
  fields,
  titleField,
  canWrite,
  pending,
  isFirst,
  isLast,
  run,
}: {
  table: ContentTable;
  row: T;
  fields: FieldSpec<T>[];
  titleField: keyof T & string;
  canWrite: boolean;
  pending: boolean;
  isFirst: boolean;
  isLast: boolean;
  run: (action: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  /** Draft values, seeded from the server row. */
  const [draft, setDraft] = React.useState<Record<string, unknown>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, row[f.name]])),
  );

  /*
   * Compared against the server row rather than tracked with a flag, so a save
   * that round-trips and revalidates clears this on its own — no "just saved"
   * state to reset, and no Save button left enabled after a successful write.
   */
  const dirty = fields.some((f) => !sameValue(draft[f.name], row[f.name]));
  const published = row.status === "published";
  const [expanded, setExpanded] = React.useState(false);

  const set = (name: string, value: unknown) => setDraft((d) => ({ ...d, [name]: value }));

  return (
    <li>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="min-w-0 flex-1 text-left"
            aria-expanded={expanded}
          >
            <p className="truncate text-sm font-medium">
              {String(row[titleField] ?? "Untitled")}
            </p>
            <p className="text-xs text-muted">{expanded ? "Hide fields" : "Edit fields"}</p>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <Chip size="sm" color={published ? "success" : "default"}>
              {published ? "Published" : row.status}
            </Chip>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Move up"
              isDisabled={!canWrite || pending || isFirst}
              onPress={() => run(() => moveContentRow(table, row.id, "up"))}
            >
              <FontAwesomeIcon icon={faArrowUp} className="w-3" />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Move down"
              isDisabled={!canWrite || pending || isLast}
              onPress={() => run(() => moveContentRow(table, row.id, "down"))}
            >
              <FontAwesomeIcon icon={faArrowDown} className="w-3" />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="danger-soft"
              aria-label="Delete"
              isDisabled={!canWrite || pending}
              onPress={() => run(() => deleteContentRow(table, row.id))}
            >
              <FontAwesomeIcon icon={faTrash} className="w-3" />
            </Button>
          </div>
        </div>

        {expanded ? (
          <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.name} className={cn(field.wide && "sm:col-span-2")}>
                {field.kind === "boolean" ? (
                  <Switch
                    isSelected={Boolean(draft[field.name])}
                    isDisabled={!canWrite}
                    onChange={(next) => set(field.name, next)}
                    className="text-sm"
                  >
                    {field.label}
                  </Switch>
                ) : (
                  <Field
                    label={field.label}
                    description={field.description}
                    placeholder={field.placeholder}
                    isDisabled={!canWrite}
                    value={toInput(draft[field.name])}
                    onChange={(v) => set(field.name, fromInput(v, field.kind))}
                  />
                )}
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <Switch
            isSelected={published}
            isDisabled={!canWrite || pending}
            onChange={(next) =>
              run(() => setContentStatus(table, row.id, next ? "published" : "draft"))
            }
            className="text-sm"
          >
            Published
          </Switch>

          <Button
            size="sm"
            variant="primary"
            isDisabled={!canWrite || pending || !dirty}
            onPress={() => run(() => updateContentRow(table, row.id, draft))}
          >
            {pending ? <Spinner size="sm" /> : <FontAwesomeIcon icon={faFloppyDisk} className="w-3" />}
            {dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </Card>
    </li>
  );
}

/** Arrays render as one-per-line; everything else as its string form. */
function toInput(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join("\n");
  return String(value);
}

function fromInput(value: string, kind: FieldKind = "text"): unknown {
  if (kind === "number") {
    const n = Number(value);
    // An empty field means "no value", not zero — the difference between a
    // free plan and a plan that costs nothing to say.
    return value.trim() === "" ? null : Number.isFinite(n) ? n : null;
  }
  if (kind === "list") {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return value;
}

/** Array-aware, so a list field is not permanently "dirty" against itself. */
function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return (a ?? "") === (b ?? "");
}
