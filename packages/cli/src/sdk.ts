import { PulseApiError, PulseCommerceClient } from "pulsecommerce-sdk";
import { resolveCredentials } from "./config.js";

/** One client, built from whatever flags/env/config resolve to for this call. */
export function clientFor(opts: { apiKey?: string; baseUrl?: string }): PulseCommerceClient {
  const { apiKey, baseUrl } = resolveCredentials(opts);
  return new PulseCommerceClient({ apiKey, baseUrl });
}

export function reportApiError(err: unknown): never {
  if (err instanceof PulseApiError) {
    console.error(`Error: ${err.message}`);
    if (err.hint) console.error(err.hint);
    process.exit(1);
  }
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
