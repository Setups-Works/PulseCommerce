import type { BaseClient } from "../client.js";
import type { AnalyticsParams, AnalyticsPayload } from "../types.js";

export class AnalyticsGroup {
  constructor(private readonly client: BaseClient) {}

  /** GET /api/analytics */
  get(params: AnalyticsParams = {}): Promise<AnalyticsPayload> {
    return this.client.request("/api/analytics", {
      query: {
        from: params.from,
        to: params.to,
        granularity: params.granularity,
        refresh: params.refresh ? "1" : undefined,
      },
    });
  }
}
