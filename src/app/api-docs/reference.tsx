"use client";

import { Check, Copy, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { exampleFor, SchemaView, type Components, type JsonSchema } from "./schema-view";

/**
 * The API reference.
 *
 * Three columns, everything expanded, one continuous scroll: navigation on the
 * left, prose and field tables down the middle, request and response samples
 * pinned to the right of whatever you are reading.
 *
 * That layout is chosen over the accordion Swagger gives you because the two
 * things a reader needs are the description and the code, and an accordion
 * shows one endpoint at a time while hiding the code until clicked. Side by
 * side, you can read what a field means and see where it goes without losing
 * either.
 *
 * It renders from this app's own OpenAPI document, so it cannot describe an
 * endpoint that does not exist or miss one that does.
 */

interface Operation {
  id: string;
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags?: string[];
  security?: unknown[];
  parameters?: {
    name: string;
    in: string;
    required?: boolean;
    description?: string;
    schema?: JsonSchema;
  }[];
  requestBody?: { required?: boolean; content?: Record<string, { schema: JsonSchema }> };
  responses?: Record<
    string,
    { description?: string; content?: Record<string, { schema: JsonSchema }> }
  >;
}

export interface Doc {
  info: { title: string; description: string; version: string };
  tags?: { name: string; description?: string }[];
  paths: Record<string, Record<string, Omit<Operation, "id" | "method" | "path">>>;
  components?: { schemas?: Components };
}

const METHOD_ORDER = ["get", "post", "put", "patch", "delete"];

export function ApiReference({ doc }: { doc: Doc }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("");

  const components = doc.components?.schemas ?? {};

  const operations = useMemo<Operation[]>(() => {
    const list: Operation[] = [];
    for (const [path, methods] of Object.entries(doc.paths)) {
      for (const method of METHOD_ORDER) {
        const op = methods[method];
        if (op) {
          list.push({ ...op, method: method.toUpperCase(), path, id: idFor(method, path) });
        }
      }
    }
    return list;
  }, [doc]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? operations.filter((op) =>
          `${op.method} ${op.path} ${op.summary ?? ""} ${(op.tags ?? []).join(" ")}`
            .toLowerCase()
            .includes(needle),
        )
      : operations;

    const map = new Map<string, Operation[]>();
    for (const op of matching) {
      const tag = op.tags?.[0] ?? "Other";
      map.set(tag, [...(map.get(tag) ?? []), op]);
    }
    // The document's own tag order groups by subject, which reads better than
    // alphabetical.
    const ordered = (doc.tags ?? []).map((t) => t.name).filter((name) => map.has(name));
    for (const key of map.keys()) if (!ordered.includes(key)) ordered.push(key);
    return ordered.map((name) => ({ name, operations: map.get(name)! }));
  }, [operations, query, doc]);

  useScrollSpy(setActive, [groups]);

  return (
    <div className="mx-auto flex max-w-350 gap-0">
      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto border-r px-4 py-8 lg:block">
        <p className="px-2 text-sm font-semibold tracking-tight">{doc.info.title}</p>
        <p className="px-2 pb-4 text-[11px] text-muted-foreground">v{doc.info.version}</p>

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-8 pl-8 text-xs"
            aria-label="Search endpoints"
          />
        </div>

        <nav className="space-y-4 pb-16">
          <ul className="space-y-0.5">
            <NavLink href="#quickstart" active={active === "quickstart"}>
              Quickstart
            </NavLink>
            <NavLink href="#authentication" active={active === "authentication"}>
              Authentication
            </NavLink>
            <NavLink href="#errors" active={active === "errors"}>
              Errors
            </NavLink>
          </ul>

          {groups.map((group) => (
            <div key={group.name}>
              <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.name}
              </p>
              <ul className="space-y-0.5">
                {group.operations.map((op) => (
                  <NavLink key={op.id} href={`#${op.id}`} active={active === op.id}>
                    <Method method={op.method} compact />
                    <span className="truncate">{op.summary ?? op.path}</span>
                  </NavLink>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <main className="min-w-0 flex-1 px-5 py-8 lg:px-10">
        {/*
          The sidebar is desktop-only, which on a phone would leave 46
          endpoints reachable by scrolling and nothing else. A native select is
          the right control here: it is one tap, the OS renders it as a
          scrollable list, and it needs no open/close state of its own.
        */}
        <div className="sticky top-0 z-10 -mx-5 mb-8 border-b bg-background/95 px-5 py-2 backdrop-blur lg:hidden">
          <label className="sr-only" htmlFor="jump-to">
            Jump to a section
          </label>
          <select
            id="jump-to"
            className="w-full rounded-md border bg-transparent px-2 py-1.5 text-xs"
            value={active}
            onChange={(e) => {
              document.getElementById(e.target.value)?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <option value="quickstart">Quickstart</option>
            <option value="authentication">Authentication</option>
            <option value="errors">Errors</option>
            {groups.map((group) => (
              <optgroup key={group.name} label={group.name}>
                {group.operations.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.method} {op.path}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="space-y-16">
          <Quickstart />
          <Authentication description={doc.info.description} />
          <Errors />

          {groups.map((group) => (
            <div key={group.name} className="space-y-16">
              <div className="space-y-1 border-b pb-3">
                <h2 className="text-xl font-semibold tracking-tight">{group.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {doc.tags?.find((t) => t.name === group.name)?.description}
                </p>
              </div>
              {group.operations.map((op) => (
                <OperationSection key={op.id} operation={op} components={components} />
              ))}
            </div>
          ))}

          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing matches “{query}”.</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}

/* ── One endpoint ─────────────────────────────────────────────────────────── */

/** POSTs that only read; mirrors the list the gate in proxy.ts uses. */
const READ_ONLY_POSTS = new Set(["/api/reports/export", "/api/whatsapp/preview", "/api/ai/chat"]);

function OperationSection({
  operation,
  components,
}: {
  operation: Operation;
  components: Components;
}) {
  // `security: []` on an operation overrides the document-wide requirement.
  const isPublic = Array.isArray(operation.security) && operation.security.length === 0;
  const needsWrite =
    !isPublic && !["GET", "HEAD"].includes(operation.method) && !READ_ONLY_POSTS.has(operation.path);

  const requestSchema = operation.requestBody?.content?.["application/json"]?.schema;
  const success = operation.responses?.["200"] ?? operation.responses?.["201"];
  const responseSchema = success?.content?.["application/json"]?.schema;

  return (
    <section id={operation.id} className="scroll-mt-6">
      {/* Docs left, code right — the point of the layout. Stacks on narrow
          screens, where side-by-side would leave both columns unreadable. */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="min-w-0 space-y-5">
          <div className="space-y-2">
            <h3 className="text-base font-semibold tracking-tight">
              {operation.summary ?? operation.path}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <Method method={operation.method} />
              <code className="break-all font-mono text-xs text-muted-foreground">
                {operation.path}
              </code>
              <ScopePill isPublic={isPublic} needsWrite={needsWrite} />
            </div>
          </div>

          {operation.description ? <Prose text={operation.description} /> : null}

          {operation.parameters?.length ? (
            <Block title="Parameters">
              <dl className="divide-y rounded-lg border">
                {operation.parameters.map((p) => (
                  <div key={`${p.in}-${p.name}`} className="px-3 py-2">
                    <dt className="flex flex-wrap items-baseline gap-2">
                      <code className="font-mono text-[11px] font-medium">{p.name}</code>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {p.schema?.type ?? "string"} · {p.in}
                      </span>
                      {p.required ? (
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          required
                        </span>
                      ) : null}
                    </dt>
                    {p.description ? (
                      <dd className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                        {p.description}
                      </dd>
                    ) : null}
                    {p.schema?.enum ? (
                      <dd className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {p.schema.enum.map((v) => JSON.stringify(v)).join(" · ")}
                      </dd>
                    ) : null}
                  </div>
                ))}
              </dl>
            </Block>
          ) : null}

          {requestSchema ? (
            <Block title={`Body${operation.requestBody?.required ? " · required" : ""}`}>
              <div className="rounded-lg border px-3 py-1">
                <SchemaView schema={requestSchema} components={components} />
              </div>
            </Block>
          ) : null}

          {responseSchema ? (
            <Block title="Returns">
              <div className="rounded-lg border px-3 py-1">
                <SchemaView schema={responseSchema} components={components} />
              </div>
            </Block>
          ) : null}

          {operation.responses ? (
            <Block title="Status codes">
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {Object.entries(operation.responses).map(([code, res]) => (
                  <li key={code} className="text-[11px]">
                    <code
                      className={`font-mono ${
                        code.startsWith("2")
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {code}
                    </code>{" "}
                    <span className="text-muted-foreground">{res.description}</span>
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}
        </div>

        {/* Sticky, so the sample stays beside the field you are reading rather
            than scrolling away at the top of a long endpoint. */}
        <div className="space-y-3 xl:sticky xl:top-6 xl:self-start">
          <RequestPanel
            operation={operation}
            isPublic={isPublic}
            body={requestSchema ? exampleFor(requestSchema, components) : null}
          />
          {responseSchema ? (
            <ResponsePanel example={exampleFor(responseSchema, components)} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ── Samples ──────────────────────────────────────────────────────────────── */

const LANGUAGES = ["cURL", "JavaScript", "Python"] as const;
type Language = (typeof LANGUAGES)[number];

/**
 * The request in three languages, generated from the operation.
 *
 * Generated rather than written per endpoint, so they cannot drift from the
 * document. Three because they cover how most people will first try this: a
 * terminal, a Node service, a script.
 */
function RequestPanel({
  operation,
  isPublic,
  body,
}: {
  operation: Operation;
  isPublic: boolean;
  body: unknown;
}) {
  const [language, setLanguage] = useState<Language>("cURL");

  return (
    <Panel
      header={
        <div className="flex gap-0.5">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLanguage(l)}
              className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                language === l
                  ? "bg-background font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      }
      code={sampleFor(language, operation, isPublic, body)}
    />
  );
}

function ResponsePanel({ example }: { example: unknown }) {
  return (
    <Panel
      header={<span className="text-[10px] text-muted-foreground">Response</span>}
      code={JSON.stringify(example, null, 2)}
    />
  );
}

function Panel({ header, code }: { header: React.ReactNode; code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-2 py-1.5">
        {header}
        <button
          type="button"
          aria-label="Copy"
          className="rounded p-1 text-muted-foreground hover:text-foreground"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </button>
      </div>
      <pre className="max-h-96 overflow-auto p-3 font-mono text-[11px] leading-relaxed">{code}</pre>
    </div>
  );
}

function sampleFor(
  language: Language,
  operation: Operation,
  isPublic: boolean,
  body: unknown,
): string {
  const url = `https://your-deployment${operation.path}`;
  const json = body ? JSON.stringify(body, null, 2) : null;

  if (language === "cURL") {
    const lines = [`curl -X ${operation.method} ${url}`];
    if (!isPublic) lines.push(`  -H "Authorization: Bearer $PULSE_API_KEY"`);
    if (json) {
      lines.push(`  -H "Content-Type: application/json"`);
      lines.push(`  -d '${indent(json, 2)}'`);
    }
    return lines.join(" \\\n");
  }

  if (language === "JavaScript") {
    const init = [`  method: "${operation.method}"`];
    const headers: string[] = [];
    if (!isPublic) headers.push(`    Authorization: \`Bearer \${process.env.PULSE_API_KEY}\``);
    if (json) headers.push(`    "Content-Type": "application/json"`);
    if (headers.length) init.push(`  headers: {\n${headers.join(",\n")},\n  }`);
    if (json) init.push(`  body: JSON.stringify(${indent(json, 2)})`);

    return [
      `const res = await fetch(`,
      `  "${url}",`,
      `  {`,
      init.map((l) => `  ${l}`).join(",\n") + ",",
      `  },`,
      `);`,
      ``,
      `if (!res.ok) throw new Error((await res.json()).error);`,
      `const data = await res.json();`,
    ].join("\n");
  }

  const args = [`    "${url}"`];
  if (!isPublic) {
    args.push(`    headers={"Authorization": f"Bearer {os.environ['PULSE_API_KEY']}"}`);
  }
  if (json) args.push(`    json=${toPython(json)}`);

  return [
    `import os, requests`,
    ``,
    `res = requests.${operation.method.toLowerCase()}(`,
    `${args.join(",\n")},`,
    `)`,
    `res.raise_for_status()`,
    `data = res.json()`,
  ].join("\n");
}

/* ── Front matter ─────────────────────────────────────────────────────────── */

function Quickstart() {
  return (
    <section id="quickstart" className="scroll-mt-6">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="min-w-0 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Quickstart</h2>
          <ol className="space-y-4 text-xs leading-relaxed text-muted-foreground">
            <Step n={1} title="Connect your store">
              Sign in, then open{" "}
              <Link href="/settings" className="underline underline-offset-2">
                Settings
              </Link>{" "}
              and authorize WooCommerce. You approve access inside your own WordPress admin — you
              never paste a consumer key anywhere.
            </Step>
            <Step n={2} title="Wait for the first sync">
              Your orders are mirrored into a database so reads are fast. The first pull takes a few
              minutes on a large store; Settings shows the progress.
            </Step>
            <Step n={3} title="Create an API key">
              Settings → API keys. Pick <Code>read</Code> unless you need to send messages. The key
              is shown once and cannot be recovered afterwards.
            </Step>
            <Step n={4} title="Make a request">
              Every endpoint is scoped to your own account. There is no parameter that changes whose
              data you get.
            </Step>
          </ol>
        </div>
        <div className="xl:sticky xl:top-6 xl:self-start">
          <Panel
            header={<span className="text-[10px] text-muted-foreground">Your first request</span>}
            code={`export PULSE_API_KEY="pc_live_…"

curl https://your-deployment/api/analytics \\
  -H "Authorization: Bearer $PULSE_API_KEY"`}
          />
        </div>
      </div>
    </section>
  );
}

function Authentication({ description }: { description: string }) {
  return (
    <section id="authentication" className="scroll-mt-6 space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">Authentication</h2>
      <div className="max-w-3xl">
        <Prose text={description} skipHeading="Authentication" />
      </div>
    </section>
  );
}

/**
 * Errors any endpoint can return.
 *
 * Written out rather than derived: these come from the gate in proxy.ts, which
 * runs before any handler and so belongs to no single operation's `responses`.
 * A client has to handle them whichever endpoint it calls.
 */
const SHARED_ERRORS = [
  ["401", "No key was sent, or it is not valid.", "Check the header. Keys start with pc_live_."],
  ["403", "The key lacks the scope this endpoint needs.", "Issue a key with write scope."],
  ["409", "No WooCommerce store is connected.", "Connect one in Settings."],
  ["422", "The body failed validation.", "The message names the field."],
  ["502", "WooCommerce refused the credentials or could not be reached.", "Re-authorize the store."],
  ["503", "The deployment is misconfigured.", "An operator has to fix this."],
] as const;

function Errors() {
  return (
    <section id="errors" className="scroll-mt-6 space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">Errors</h2>
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Errors are JSON with an <Code>error</Code> field saying what happened and a <Code>hint</Code>{" "}
        field saying what to do about it. These can come from any endpoint, because they are decided
        before the request reaches one.
      </p>
      <div className="max-w-3xl overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Meaning</th>
              <th className="px-3 py-2 font-medium">What to do</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {SHARED_ERRORS.map(([code, meaning, action]) => (
              <tr key={code}>
                <td className="px-3 py-2 align-top font-mono">{code}</td>
                <td className="px-3 py-2 align-top text-muted-foreground">{meaning}</td>
                <td className="px-3 py-2 align-top text-muted-foreground">{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── Shared bits ──────────────────────────────────────────────────────────── */

/**
 * Highlights the section currently in view.
 *
 * IntersectionObserver rather than a scroll handler: the callback fires only
 * when a boundary is crossed, instead of on every frame of every scroll. The
 * top margin biases toward whatever is near the top of the viewport, which is
 * what a reader is looking at.
 */
function useScrollSpy(onChange: (id: string) => void, deps: unknown[]) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("section[id]"));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) onChangeRef.current(visible[0].target.id);
      },
      { rootMargin: "-10% 0px -80% 0px" },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
          active
            ? "bg-muted font-medium text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {children}
      </a>
    </li>
  );
}

function Method({ method, compact = false }: { method: string; compact?: boolean }) {
  const tone =
    method === "GET"
      ? "text-emerald-600 dark:text-emerald-400"
      : method === "DELETE"
        ? "text-red-600 dark:text-red-400"
        : "text-amber-600 dark:text-amber-400";

  if (compact) {
    return <span className={`w-8 shrink-0 font-mono text-[9px] font-semibold ${tone}`}>{method}</span>;
  }
  return (
    <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${tone}`}>
      {method}
    </span>
  );
}

function ScopePill({ isPublic, needsWrite }: { isPublic: boolean; needsWrite: boolean }) {
  const label = isPublic ? "public" : needsWrite ? "write scope" : "read scope";
  return (
    <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
      {label}
    </span>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium text-foreground">
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <div>{children}</div>
      </div>
    </li>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{children}</code>;
}

/**
 * The document's descriptions are Markdown. Rather than pull in a renderer for
 * three constructs, this handles the three actually used: fenced code,
 * headings, and inline code with bold.
 */
function Prose({ text, skipHeading }: { text: string; skipHeading?: string }) {
  const blocks = text.split(/```/);
  return (
    <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
      {blocks.map((block, i) =>
        i % 2 === 1 ? (
          <pre
            key={i}
            className="overflow-x-auto rounded-md border bg-muted/30 p-2.5 font-mono text-[11px] text-foreground"
          >
            {block.replace(/^bash\n/, "").trim()}
          </pre>
        ) : (
          block
            .split("\n\n")
            .filter(Boolean)
            .map((para, j) =>
              para.startsWith("## ") ? (
                // Skipped when it repeats the section heading already above it.
                para.slice(3).trim() === skipHeading ? null : (
                  <h3 key={`${i}-${j}`} className="pt-2 text-sm font-semibold text-foreground">
                    {para.slice(3)}
                  </h3>
                )
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
 * The input is this application's own OpenAPI document rather than user
 * content, but everything is escaped first regardless, so a future edit to that
 * document cannot become markup by accident.
 */
function inline(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-medium text-foreground">$1</strong>');
}

function indent(text: string, spaces: number): string {
  return text.split("\n").join(`\n${" ".repeat(spaces)}`);
}

/** JSON is close enough to a Python literal apart from these three. */
function toPython(json: string): string {
  return indent(json, 4)
    .replace(/\btrue\b/g, "True")
    .replace(/\bfalse\b/g, "False")
    .replace(/\bnull\b/g, "None");
}

function idFor(method: string, path: string): string {
  // Collapse runs of punctuation and trim the edges, so a leading "/" does not
  // become a stray dash in every anchor.
  return `${method}-${path}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
