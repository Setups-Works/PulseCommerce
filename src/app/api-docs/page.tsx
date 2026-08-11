import type { Metadata } from "next";
import { ApiReference } from "./reference";

export const metadata: Metadata = {
  title: "API reference · PulseCommerce",
  description: "Every endpoint this application exposes, and how to authenticate to them.",
};

/**
 * API reference.
 *
 * Rendered from the OpenAPI document at /api/openapi. That document is the
 * artefact that matters and is served by the app itself; this page is one way
 * of reading it, and CI checks separately that it describes every route that
 * exists.
 */
export default function ApiDocsPage() {
  return (
    <main>
      <ApiReference />
    </main>
  );
}
