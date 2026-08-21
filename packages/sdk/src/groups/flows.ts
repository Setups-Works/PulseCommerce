import type { BaseClient } from "../client.js";

export class FlowsGroup {
  constructor(private readonly client: BaseClient) {}

  /** GET /api/whatsapp/flows */
  list(): Promise<Record<string, unknown>> {
    return this.client.request("/api/whatsapp/flows");
  }

  /** GET /api/whatsapp/flows/{id} */
  get(id: string): Promise<Record<string, unknown>> {
    return this.client.request(`/api/whatsapp/flows/${encodeURIComponent(id)}`);
  }
}
