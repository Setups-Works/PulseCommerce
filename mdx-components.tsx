import type { MDXComponents } from "mdx/types";
import Link from "next/link";

/**
 * Global element styling for every .mdx page under /docs.
 *
 * Hand-mapped to the site's actual type scale rather than
 * `@tailwindcss/typography`'s `prose` classes — that plugin isn't installed,
 * and everywhere else on this site (see `SectionHeading` in
 * `src/components/marketing/sections.tsx`) builds its typography from plain
 * Tailwind utilities rather than a generic prose block. Docs content should
 * look like it belongs to the same product, not like an inserted blog post.
 */
const components: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="mt-0 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-12 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="mt-8 text-lg font-medium tracking-tight">{children}</h3>,
  p: ({ children }) => (
    <p className="mt-4 text-base leading-relaxed text-muted-foreground">{children}</p>
  ),
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-5 text-base text-muted-foreground">{children}</ul>,
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-base text-muted-foreground">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
  a: ({ href, children }) => {
    const internal = typeof href === "string" && href.startsWith("/");
    const className = "font-medium text-primary underline-offset-4 hover:underline";
    if (internal) {
      return (
        <Link href={href} className={className}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    );
  },
  code: ({ children }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mt-4 overflow-x-auto rounded-xl border bg-neutral-950 p-4 font-mono text-[13px] leading-relaxed text-white/85 ring-1 ring-foreground/10 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mt-4 overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b bg-muted/40">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border-t px-3 py-2 align-top">{children}</td>,
  hr: () => <hr className="my-10 border-t" />,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
