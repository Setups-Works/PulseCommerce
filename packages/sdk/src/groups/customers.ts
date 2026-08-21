import type { BaseClient } from "../client.js";
import type { DateRange } from "../types.js";

export class CustomersGroup {
  constructor(private readonly client: BaseClient) {}

  /** GET /api/customers/{key} */
  get(key: string, range: DateRange = {}): Promise<Record<string, unknown>> {
    return this.client.request(`/api/customers/${encodeURIComponent(key)}`, {
      query: { from: range.from, to: range.to },
    });
  }
}
