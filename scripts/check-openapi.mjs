/**
 * Checks the hand-written OpenAPI document against the routes that exist.
 *
 * The document is maintained by hand because no generator reads Next.js
 * handlers with Zod validation inside them faithfully. The cost of that choice
 * is drift, so this pays it down: a route with no entry fails the build.
 *
 * Routes that are part of a redirect flow rather than an API are exempt —
 * documenting a callback WooCommerce posts to would not help anyone.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const EXEMPT = new Set([
  "/api/auth/woo/callback", // WooCommerce posts here, server to server
  "/api/auth/woo/return",   // the browser leg of the same flow
]);

function routeFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) routeFiles(full, found);
    else if (entry === "route.ts") found.push(full);
  }
  return found;
}

const routes = routeFiles("src/app/api")
  .map((f) => "/" + f.replace(/^src\/app\//, "").replace(/\/route\.ts$/, ""))
  // Next's [param] becomes OpenAPI's {param}.
  .map((r) => r.replace(/\[(\w+)\]/g, "{$1}"))
  .filter((r) => !EXEMPT.has(r))
  .sort();

const source = readFileSync("src/lib/openapi.ts", "utf8");
const documented = [...source.matchAll(/^\s{4}"(\/api\/[^"]+)":/gm)].map((m) => m[1]);

const missing = routes.filter((r) => !documented.includes(r));
const stale = documented.filter((d) => !routes.includes(d) && !EXEMPT.has(d));

for (const r of routes) {
  console.log(`  ${documented.includes(r) ? "ok   " : "MISS "} ${r}`);
}

if (missing.length) {
  console.error(`\n${missing.length} route(s) not in the API docs:`);
  for (const m of missing) console.error(`  ${m}`);
}
if (stale.length) {
  console.error(`\n${stale.length} documented path(s) with no route:`);
  for (const s of stale) console.error(`  ${s}`);
}

if (missing.length || stale.length) process.exit(1);
console.log(`\nAll ${routes.length} routes documented.`);
