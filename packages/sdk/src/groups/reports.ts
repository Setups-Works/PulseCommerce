import type { BaseClient } from "../client.js";
import type { ExportRequest } from "../types.js";

export class ReportsGroup {
  constructor(private readonly client: BaseClient) {}

  /** POST /api/reports/export — only needs the `read` scope; it renders, it doesn't act. */
  export(body: ExportRequest): Promise<ArrayBuffer> {
    return this.client.requestBinary("/api/reports/export", { method: "POST", body });
  }
}
