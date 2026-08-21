import type { BaseClient } from "../client.js";
import type { BroadcastRequest, CampaignRequest, PreviewResult, Progress, TestMessageRequest, TestMessageResult } from "../types.js";

export class CampaignsGroup {
  constructor(private readonly client: BaseClient) {}

  /** POST /api/whatsapp/preview — dry run, resolves recipients, sends nothing. */
  preview(body: CampaignRequest): Promise<PreviewResult> {
    return this.client.request("/api/whatsapp/preview", { method: "POST", body });
  }

  /**
   * POST /api/whatsapp/broadcast — `confirm` must equal the preview's
   * `deliverable` count; the audience is re-resolved and the send refused if
   * it changed. Call `preview()` first — this method does not do it for you.
   */
  broadcast(body: BroadcastRequest): Promise<Progress> {
    return this.client.request("/api/whatsapp/broadcast", { method: "POST", body });
  }

  /** POST /api/whatsapp/test — one message to a number typed by hand. */
  test(body: TestMessageRequest): Promise<TestMessageResult> {
    return this.client.request("/api/whatsapp/test", { method: "POST", body });
  }

  /** GET /api/whatsapp/broadcast/{id} */
  status(broadcastId: string): Promise<Progress> {
    return this.client.request(`/api/whatsapp/broadcast/${encodeURIComponent(broadcastId)}`);
  }

  /** DELETE /api/whatsapp/broadcast/{id} — batches already accepted still go out. */
  cancel(broadcastId: string): Promise<Progress> {
    return this.client.request(`/api/whatsapp/broadcast/${encodeURIComponent(broadcastId)}`, {
      method: "DELETE",
    });
  }
}
