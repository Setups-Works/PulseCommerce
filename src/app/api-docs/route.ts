import { ApiReference } from "@scalar/nextjs-api-reference";
import { openApiDocument } from "@/lib/openapi";

export const runtime = "nodejs";

/**
 * The API reference, rendered by Scalar.
 *
 * A route rather than a page: Scalar's Next adapter returns a complete HTML
 * document, so it owns the whole response. That also keeps the reference out
 * of the app shell, which is right — somebody reading this is integrating, not
 * using the dashboard.
 *
 * ─── content, not url ──────────────────────────────────────────────────────
 *
 * The document is passed as an object rather than pointed at `/api/openapi`.
 * It is already a module in this bundle, so a URL would mean the page fetching
 * something the server could hand it directly: an extra round trip, a loading
 * state, and a page that breaks if that endpoint ever starts requiring auth.
 * `/api/openapi` stays available for tooling that wants the raw specification.
 *
 * ─── The pinned CDN ────────────────────────────────────────────────────────
 *
 * Scalar loads its bundle from jsDelivr, by default from an unversioned URL
 * that resolves to whatever is newest. That means these docs could change
 * appearance, or break, without anything in this repository changing. Pinning
 * the version makes an upgrade a commit somebody made on purpose.
 *
 * The remaining trade is one third-party request on this page. Worth it here —
 * the alternative is vendoring a megabyte of JavaScript into the build — but it
 * does mean the reference degrades if jsDelivr is unreachable, which is part of
 * why the raw specification stays served from this app.
 */
const SCALAR_VERSION = "1.64.1";

export const GET = ApiReference({
  content: openApiDocument,
  cdn: `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${SCALAR_VERSION}`,
  pageTitle: "PulseCommerce API reference",
  theme: "default",
  /*
   * Schemas are shown inline on each endpoint, where they are read. The
   * separate Models section repeats them with no context and makes the sidebar
   * longer than the API itself.
   */
  hideModels: true,
  // curl first: it is the one every reader can paste without setting up a
  // project. The other clients are still there in the dropdown.
  defaultHttpClient: { targetKey: "shell", clientKey: "curl" },
  metaData: {
    title: "PulseCommerce API reference",
    description: "Every endpoint this application exposes, and how to authenticate to them.",
  },
});
