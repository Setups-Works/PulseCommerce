"use client";

import { Check, ChevronRight, Copy, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * The API reference, rendered from this app's own OpenAPI document.
 *
 * It replaces a Swagger UI drop-in. Swagger works, but it arrives as ~1MB of
 * JavaScript and its own stylesheet, ignores the product's design entirely, and
 * spends most of its space on a "Try it out" panel that was switched off —
 * every endpoint here needs a connected store or changes real state, so a live
 * request from a docs page is not something to offer casually.
 *
 * What a developer actually needs is the shape of each endpoint, its scopes,
 * and something they can paste into a terminal. That is what this shows.
 */

interface Operation {
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags?: string[];
  security?: unknown[];
  parameters?: { name: string; in: string; required?: boolean; description?: string }[];
  requestBody?: unknown;
  responses?: Record<string, { description?: string }>;
}

interface Doc {
  info: { title: string; description: string; version: string };
  tags?: { name: string; description?: string }[];
  paths: Record<string, Record<string, Omit<Operation, "method" | "path">>>;
}

const METHOD_ORDER = ["get", "post", "put", "patch", "delete"];

export function ApiReference() {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/openapi")
      .then((res) => res.json())
      .then(setDoc)
      .catch(() => setFailed(true));
  }, []);

  const operations = useMemo<Operation[]>(() => {
    if (!doc) return [];
    const list: Operation[] = [];
    for (const [path, methods] of Object.entries(doc.paths)) {
      for (const method of METHOD_ORDER) {
        const op = methods[method];
        if (op) list.push({ ...op, method: method.toUpperCase(), path });
      }
    }
    return list;
  }, [doc]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return operations;
    return operations.filter((op) =>
      `${op.method} ${op.path} ${op.summary ?? ""} ${(op.tags ?? []).join(" ")}`
        .toLowerCase()
        .includes(needle),
    );
  }, [operations, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Operation[]>();
    for (const op of filtered) {
      const tag = op.tags?.[0] ?? "Other";
      map.set(tag, [...(map.get(tag) ?? []), op]);
    }
    // Follow the document's own tag order; it groups by subject rather than
    // alphabetically, which is the more useful reading order.
    const ordered = (doc?.tags ?? []).map((t) => t.name).filter((name) => map.has(name));
    for (const key of map.keys()) if (!ordered.includes(key)) ordered.push(key);
    return ordered.map((name) => ({ name, operations: map.get(name)! }));
  }, [filtered, doc]);

  if (failed) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        The reference could not be loaded. The specification itself is always available at{" "}
        <a className="underline" href="/api/openapi">
          /api/openapi
        </a>
        .
      </p>
    );
  }

  if (!doc) return <p className="p-6 text-sm text-muted-foreground">Loading the reference…</p>;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Sidebar. Sticky on desktop, inline above the content on mobile. */}
      <nav className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Endpoints
        </p>
        <ul className="space-y-0.5">
          {grouped.map((group) => (
            <li key={group.name}>
              <a
                href={`#${slug(group.name)}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted"
              >
                {group.name}
                <span className="text-[10px] text-muted-foreground">
                  {group.operations.length}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 space-y-10">
        <header className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{doc.info.title}</h1>
            <p className="text-xs text-muted-foreground">Version {doc.info.version}</p>
          </div>
          <Prose text={doc.info.description} />
        </header>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter endpoints"
            className="pl-8"
            aria-label="Filter endpoints"
          />
        </div>

        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing matches “{query}”.</p>
        ) : (
          grouped.map((group) => (
            <section key={group.name} id={slug(group.name)} className="scroll-mt-6 space-y-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">{group.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {doc.tags?.find((t) => t.name === group.name)?.description}
                </p>
              </div>
              <div className="divide-y rounded-lg border">
                {group.operations.map((op) => (
                  <OperationRow key={`${op.method} ${op.path}`} operation={op} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function OperationRow({ operation }: { operation: Operation }) {
  const [open, setOpen] = useState(false);

  // `security: []` on an operation overrides the document-wide requirement.
  const isPublic = Array.isArray(operation.security) && operation.security.length === 0;
  const needsWrite = !isPublic && !["GET", "HEAD"].includes(operation.method) && !READ_ONLY.has(operation.path);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50"
        aria-expanded={open}
      >
        <ChevronRight
          className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
        />
        <Method method={operation.method} />
        <code className="min-w-0 flex-1 truncate font-mono text-xs">{operation.path}</code>
        <span className="hidden truncate text-xs text-muted-foreground sm:block sm:max-w-[45%]">
          {operation.summary}
        </span>
        {isPublic ? (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            public
          </Badge>
        ) : (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {needsWrite ? "write" : "read"}
          </Badge>
        )}
      </button>

      {open ? (
        <div className="space-y-4 border-t bg-muted/20 px-3 py-4 pl-9">
          {operation.description ? <Prose text={operation.description} /> : null}

          {operation.parameters?.length ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Parameters
              </p>
              <ul className="space-y-1">
                {operation.parameters.map((p) => (
                  <li key={p.name} className="text-xs">
                    <code className="font-mono">{p.name}</code>
                    <span className="text-muted-foreground">
                      {" "}
                      in {p.in}
                      {p.required ? " · required" : ""}
                      {p.description ? ` — ${p.description}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {operation.responses ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Responses
              </p>
              <ul className="space-y-1">
                {Object.entries(operation.responses).map(([code, res]) => (
                  <li key={code} className="text-xs">
                    <code className={`font-mono ${code.startsWith("2") ? "" : "text-muted-foreground"}`}>
                      {code}
                    </code>{" "}
                    <span className="text-muted-foreground">{res.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Curl operation={operation} isPublic={isPublic} />
        </div>
      ) : null}
    </div>
  );
}

/** Endpoints that POST but only read; mirrors the list the gate uses. */
const READ_ONLY = new Set(["/api/reports/export", "/api/whatsapp/preview", "/api/ai/chat"]);

function Curl({ operation, isPublic }: { operation: Operation; isPublic: boolean }) {
  const [copied, setCopied] = useState(false);

  // Built at render rather than stored, so it always matches the live document.
  const lines = [`curl -X ${operation.method} https://your-deployment${operation.path}`];
  if (!isPublic) lines.push(`  -H "Authorization: Bearer pc_live_…"`);
  if (operation.requestBody) {
    lines.push(`  -H "Content-Type: application/json"`, `  -d '{ … }'`);
  }
  const snippet = lines.join(" \\\n");

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Example
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 gap-1 px-1.5 text-[11px]"
          onClick={async () => {
            await navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md border bg-background p-2.5 font-mono text-[11px] leading-relaxed">
        {snippet}
      </pre>
    </div>
  );
}

function Method({ method }: { method: string }) {
  const tone =
    method === "GET"
      ? "text-emerald-600 dark:text-emerald-400"
      : method === "DELETE"
        ? "text-red-600 dark:text-red-400"
        : "text-amber-600 dark:text-amber-400";
  return <span className={`w-14 shrink-0 font-mono text-[11px] font-semibold ${tone}`}>{method}</span>;
}

/**
 * The document's descriptions are Markdown. Rather than pull in a renderer for
 * three constructs, this handles the three that are actually used: fenced code,
 * headings, and inline code with bold.
 */
function Prose({ text }: { text: string }) {
  const blocks = text.split(/```/);
  return (
    <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
      {blocks.map((block, i) =>
        i % 2 === 1 ? (
          <pre
            key={i}
            className="overflow-x-auto rounded-md border bg-background p-2.5 font-mono text-[11px] text-foreground"
          >
            {block.replace(/^bash\n/, "").trim()}
          </pre>
        ) : (
          block
            .split("\n\n")
            .filter(Boolean)
            .map((para, j) =>
              para.startsWith("## ") ? (
                <h3 key={`${i}-${j}`} className="pt-2 text-sm font-semibold text-foreground">
                  {para.slice(3)}
                </h3>
              ) : (
                <p key={`${i}-${j}`} dangerouslySetInnerHTML={{ __html: inline(para) }} />
              ),
            )
        ),
      )}
    </div>
  );
}

/**
 * Bold and inline code only.
 *
 * The input is this application's own OpenAPI document, compiled into the
 * bundle — not user content — so there is no untrusted HTML here. Everything
 * else is escaped first regardless, so a future edit to the document cannot
 * turn into markup by accident.
 */
function inline(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-medium text-foreground">$1</strong>');
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
