import type { Metadata } from "next";
import { openApiDocument } from "@/lib/openapi";
import { ApiReference, type Doc } from "./reference";

export const metadata: Metadata = {
  title: "API reference · PulseCommerce",
  description: "Every endpoint this application exposes, and how to authenticate to them.",
};

/**
 * API reference.
 *
 * The document is imported rather than fetched. It is a module in this bundle,
 * so there is nothing to wait for: fetching `/api/openapi` from the client
 * would mean an empty page until the request landed, a loading flash on every
 * visit, and nothing at all for a crawler or a shared link preview.
 *
 * Importing it renders the whole reference on the server. The client component
 * keeps only what needs a browser — search, the language tabs, scroll spy.
 */
export default function ApiDocsPage() {
  return (
    <main>
      {/* The document is `as const`, which types every string as a literal.
          Widening once here beats threading readonly types through the view. */}
      <ApiReference doc={openApiDocument as unknown as Doc} />
    </main>
  );
}
