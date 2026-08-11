"use client";

import { useState } from "react";

/**
 * Renders a JSON Schema as a readable field list.
 *
 * This is the part a reference lives or dies on. Knowing an endpoint exists is
 * not much use without knowing the shape it returns, and "see the OpenAPI
 * document" is not an answer — the whole point of a reference is that somebody
 * has already read it for you.
 *
 * ─── Depth ─────────────────────────────────────────────────────────────────
 *
 * Analytics responses nest four or five levels. Rendering all of it expanded
 * produces a wall nobody reads, so anything below the top level starts
 * collapsed and says how many fields it is hiding. The first level is always
 * open, because that is the shape you are usually checking.
 */

export interface JsonSchema {
  type?: string | string[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  examples?: unknown[];
  format?: string;
  nullable?: boolean;
  $ref?: string;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  additionalProperties?: boolean | JsonSchema;
  minItems?: number;
  maxLength?: number;
}

/** Where `$ref` points. Only local component refs are used in this document. */
export type Components = Record<string, JsonSchema>;

export function SchemaView({
  schema,
  components,
  depth = 0,
}: {
  schema: JsonSchema;
  components: Components;
  depth?: number;
}) {
  const resolved = resolve(schema, components);

  if (resolved.oneOf || resolved.anyOf) {
    const options = resolved.oneOf ?? resolved.anyOf ?? [];
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">
          One of {options.length} shapes:
        </p>
        {options.map((option, i) => (
          <div key={i} className="rounded-md border border-dashed p-2">
            <SchemaView schema={option} components={components} depth={depth} />
          </div>
        ))}
      </div>
    );
  }

  // An array of objects is described by its element, not by the array.
  if (typeOf(resolved) === "array" && resolved.items) {
    const item = resolve(resolved.items, components);
    if (item.properties) {
      return (
        <div className="space-y-1.5">
          <p className="text-[11px] text-muted-foreground">Array of:</p>
          <SchemaView schema={item} components={components} depth={depth} />
        </div>
      );
    }
    return <Leaf name="[]" schema={item} />;
  }

  if (!resolved.properties) {
    return <Leaf name="" schema={resolved} />;
  }

  const required = new Set(resolved.required ?? []);

  return (
    <ul className="space-y-0">
      {Object.entries(resolved.properties).map(([name, raw]) => (
        <Row
          key={name}
          name={name}
          schema={raw}
          components={components}
          depth={depth}
          required={required.has(name)}
        />
      ))}
    </ul>
  );
}

function Row({
  name,
  schema,
  components,
  depth,
  required,
}: {
  name: string;
  schema: JsonSchema;
  components: Components;
  depth: number;
  required: boolean;
}) {
  const resolved = resolve(schema, components);
  const nested = childOf(resolved, components);
  const count = nested ? Object.keys(nested.properties ?? {}).length : 0;

  // Only the first level is open by default; see the note at the top.
  const [open, setOpen] = useState(depth === 0 && count > 0 && count <= 6);

  return (
    <li className="border-b py-1.5 last:border-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <code className="font-mono text-[11px] font-medium">{name}</code>
        <span className="font-mono text-[10px] text-muted-foreground">{describe(resolved)}</span>
        {required ? (
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
            required
          </span>
        ) : null}
        {count > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
            aria-expanded={open}
          >
            {open ? "hide" : `${count} field${count === 1 ? "" : "s"}`}
          </button>
        ) : null}
      </div>

      {resolved.description ? (
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          {resolved.description}
        </p>
      ) : null}

      {resolved.enum ? (
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          {resolved.enum.map((v) => JSON.stringify(v)).join(" · ")}
        </p>
      ) : null}

      {resolved.examples?.length ? (
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          e.g. {JSON.stringify(resolved.examples[0])}
        </p>
      ) : null}

      {open && nested ? (
        <div className="mt-1.5 border-l pl-3">
          <SchemaView schema={nested} components={components} depth={depth + 1} />
        </div>
      ) : null}
    </li>
  );
}

function Leaf({ name, schema }: { name: string; schema: JsonSchema }) {
  return (
    <p className="text-[11px] text-muted-foreground">
      {name ? <code className="font-mono">{name}</code> : null}{" "}
      <span className="font-mono text-[10px]">{describe(schema)}</span>
      {schema.description ? ` — ${schema.description}` : ""}
    </p>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function resolve(schema: JsonSchema, components: Components): JsonSchema {
  if (!schema?.$ref) return schema ?? {};
  // Only `#/components/schemas/Name` appears in this document.
  const name = schema.$ref.split("/").pop();
  return (name && components[name]) || {};
}

/** The object a row can expand into, if it has one. */
function childOf(schema: JsonSchema, components: Components): JsonSchema | null {
  if (schema.properties) return schema;
  if (schema.items) {
    const item = resolve(schema.items, components);
    if (item.properties) return item;
  }
  return null;
}

function typeOf(schema: JsonSchema): string {
  if (Array.isArray(schema.type)) return schema.type[0];
  if (schema.type) return schema.type;
  if (schema.properties) return "object";
  if (schema.items) return "array";
  return "any";
}

function describe(schema: JsonSchema): string {
  const base = typeOf(schema);
  const suffix = schema.format ? `<${schema.format}>` : "";
  const nullable = schema.nullable ? " | null" : "";
  if (base === "array") return `array${suffix}${nullable}`;
  return `${base}${suffix}${nullable}`;
}

/**
 * A plausible example body, built from the schema.
 *
 * Generated rather than hand-written per endpoint: a hand-written example is
 * one more thing to keep in step with the code, and this one cannot drift.
 */
export function exampleFor(schema: JsonSchema, components: Components, depth = 0): unknown {
  const s = resolve(schema, components);
  if (depth > 3) return "…";

  if (s.examples?.length) return s.examples[0];
  if (s.enum?.length) return s.enum[0];

  switch (typeOf(s)) {
    case "object": {
      if (!s.properties) return {};
      const out: Record<string, unknown> = {};
      // Required fields first, then a couple more, so the example shows the
      // minimum that works rather than every optional field at once.
      const names = Object.keys(s.properties);
      const required = s.required ?? [];
      const chosen = [...required, ...names.filter((n) => !required.includes(n))].slice(0, 6);
      for (const name of chosen) out[name] = exampleFor(s.properties[name], components, depth + 1);
      return out;
    }
    case "array":
      return s.items ? [exampleFor(s.items, components, depth + 1)] : [];
    case "integer":
    case "number":
      return 0;
    case "boolean":
      return true;
    default:
      if (s.format === "date") return "2026-01-31";
      if (s.format === "date-time") return "2026-01-31T09:00:00.000Z";
      if (s.format === "uuid") return "1f0c…";
      return "string";
  }
}
