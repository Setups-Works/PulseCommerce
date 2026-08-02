import type { Metadata } from "next";
import { SwaggerReference } from "./swagger";

export const metadata: Metadata = {
  title: "API reference · PulseCommerce",
  description: "Every endpoint this application exposes.",
};

/**
 * API reference.
 *
 * Swagger UI over the OpenAPI document at /api/openapi. The document is the
 * artefact that matters and is served by the app itself; this page is one way
 * of reading it, and CI checks separately that it describes every route that
 * exists.
 */
export default function ApiDocsPage() {
  return (
    <main>
      <h1 className="sr-only">PulseCommerce API reference</h1>
      <SwaggerReference />
    </main>
  );
}
