import type { BaseClient } from "../client.js";
import type { SyncResult, SyncStatus } from "../types.js";

export class SyncGroup {
  constructor(private readonly client: BaseClient) {}

  /** GET /api/sync */
  status(): Promise<SyncStatus> {
    return this.client.request("/api/sync");
  }

  /** POST /api/sync — requires the `write` scope. */
  run(options: { full?: boolean } = {}): Promise<SyncResult> {
    return this.client.request("/api/sync", {
      method: "POST",
      query: options.full ? { full: "1" } : undefined,
    });
  }
}
