import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API reference · PulseCommerce",
  description: "Every endpoint this application exposes.",
};

/**
 * API reference.
 *
 * Renders the OpenAPI document with Scalar, loaded from a CDN. Self-hosting the
 * viewer would add megabytes to the bundle for a page most deployments open
 * once; the spec itself is served locally from /api/openapi and is the thing
 * that matters.
 */
export default function ApiDocsPage() {
  return (
    <>
      <div id="app" />
      <script
        id="api-reference"
        data-url="/api/openapi"
        data-configuration='{"theme":"bluePlanet","hideDownloadButton":false,"darkMode":true}'
      />
      <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference" async />
    </>
  );
}
