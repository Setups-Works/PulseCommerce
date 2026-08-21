import createMDX from "@next/mdx";
import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * Applied to every response. None of these change how the app behaves; they
 * close off attacks that work by getting a *browser* to misuse a correct
 * response.
 *
 * Deliberately absent: a Content-Security-Policy. Next injects inline scripts
 * for hydration and streaming, so a useful CSP needs per-request nonces
 * threaded through the proxy and into every inline script. That is worth doing
 * and is a change with real breakage risk — it should land on its own, with a
 * report-only rollout first, rather than being slipped in beside a feature.
 */
const SECURITY_HEADERS = [
  {
    // The site is served over HTTPS in production; tell browsers never to try
    // plain HTTP again, including for subdomains.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // Stops a browser from second-guessing a declared Content-Type, which is
    // how a text/plain upload becomes executable script.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Clickjacking. The admin panel has destructive one-click actions, so
    // being framable by another origin is a genuine risk rather than a
    // theoretical one.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // The modern equivalent of the above, which some browsers honour instead.
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'",
  },
  {
    // Send the full URL to ourselves, only the origin cross-site. Store URLs
    // and admin paths should not leak to third parties in a Referer header.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Nothing here needs a camera, a microphone or a location.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    // Blocks Adobe/Flash-era cross-domain policy files.
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
];

const nextConfig: NextConfig = {
  // The docs guides under /docs are .mdx files — everything else in the app
  // is unaffected, since this only adds two extensions to the existing set.
  pageExtensions: ["ts", "tsx", "mdx"],

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },

  images: {
    /*
     * Supabase Storage is the only remote image host. Scoped to this project's
     * public object path rather than the whole domain, so a different project
     * on the same host cannot be proxied through our optimizer.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zyivovtldvaapvwskeku.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

// The docs guides use GFM tables for scope/error/command reference — plain
// CommonMark (what @next/mdx uses by default) doesn't parse `| a | b |` rows
// at all, so without this plugin those tables render as literal pipe text.
// remark-gfm is already a project dependency, used elsewhere for rendering
// the AI assistant's markdown output. Passed by name rather than imported:
// Turbopack can't hand a JS function to its Rust MDX compiler, only a
// serializable plugin reference.
const withMDX = createMDX({
  options: { remarkPlugins: ["remark-gfm"] },
});

export default withMDX(nextConfig);
