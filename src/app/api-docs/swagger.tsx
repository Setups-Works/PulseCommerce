"use client";

import "swagger-ui-dist/swagger-ui.css";
import { useEffect, useRef, useState } from "react";

/**
 * Swagger UI, mounted against this application's own OpenAPI document.
 *
 * Served from the bundle rather than a CDN. The page is code-split, so the
 * weight lands only on whoever opens the reference, and in exchange the docs
 * work behind a firewall, survive a CDN outage, and are pinned to the version
 * in package-lock rather than to whatever jsdelivr serves that day.
 *
 * The bundle is imported dynamically because it touches `window` at module
 * scope, which would throw during prerendering.
 */
export function SwaggerReference() {
  const mount = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { default: SwaggerUI } = await import("swagger-ui-dist/swagger-ui-es-bundle.js");
        if (cancelled || !mount.current) return;

        SwaggerUI({
          domNode: mount.current,
          url: "/api/openapi",
          // Every route here either needs a connected store or changes real
          // state, so "Try it out" would fire live requests from a docs page.
          // Reading the contract is what this page is for.
          supportedSubmitMethods: [],
          docExpansion: "list",
          defaultModelsExpandDepth: 0,
          deepLinking: true,
          persistAuthorization: true,
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <p className="p-6 text-sm">
        The reference viewer failed to load. The specification itself is always
        available at <a className="underline" href="/api/openapi">/api/openapi</a>.
      </p>
    );
  }

  return <div ref={mount} data-testid="swagger-ui" />;
}
