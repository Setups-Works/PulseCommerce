"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Assistant replies, rendered.
 *
 * The model answers in markdown — bold figures, bullet lists, and pipe tables
 * whenever it lists products or customers. Printed as plain text those arrive as
 * `**₹6.38L**` and a wall of pipes and dashes, which is unreadable exactly when
 * the answer is most useful.
 *
 * Every element is styled explicitly rather than through a typography plugin, so
 * the result matches the rest of the application instead of looking like a
 * document dropped into it.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-[13px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,

          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,

          ul: ({ children }) => (
            <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,

          h1: ({ children }) => <h3 className="mt-3 mb-1.5 font-semibold first:mt-0">{children}</h3>,
          h2: ({ children }) => <h3 className="mt-3 mb-1.5 font-semibold first:mt-0">{children}</h3>,
          h3: ({ children }) => <h3 className="mt-3 mb-1.5 font-semibold first:mt-0">{children}</h3>,

          /*
           * Tables scroll inside their own box. A seven-column stock table is
           * wider than the conversation column, and letting it stretch the page
           * would push the composer off screen.
           */
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-md border">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b px-2.5 py-1.5 text-left font-semibold whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b px-2.5 py-1.5 align-top last:border-b-0">{children}</td>
          ),
          tr: ({ children }) => <tr className="last:[&>td]:border-b-0">{children}</tr>,

          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-md bg-muted p-2.5 text-[11px]">
              {children}
            </pre>
          ),

          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {children}
            </a>
          ),

          hr: () => <hr className="my-3" />,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 pl-2.5 text-muted-foreground">
              {children}
            </blockquote>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
