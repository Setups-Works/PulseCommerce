import { AnalyticsGroup } from "./groups/analytics.js";
import { AuthGroup } from "./groups/auth.js";
import { CampaignsGroup } from "./groups/campaigns.js";
import { CustomersGroup } from "./groups/customers.js";
import { FlowsGroup } from "./groups/flows.js";
import { ReportsGroup } from "./groups/reports.js";
import { SettingsGroup } from "./groups/settings.js";
import { SyncGroup } from "./groups/sync.js";
import { BaseClient, type PulseCommerceClientOptions } from "./client.js";

/**
 * A typed client for the PulseCommerce API.
 *
 * ```ts
 * const client = new PulseCommerceClient({
 *   apiKey: "pc_live_...",
 *   baseUrl: "https://your-deployment",
 * });
 * const { kpis } = await client.analytics.get({ from: "2026-01-01" });
 * ```
 *
 * `apiKey` can be omitted only when the caller is about to obtain one via
 * `client.auth.startDeviceLogin()` / `pollDeviceLogin()` — every other method
 * requires it.
 */
export class PulseCommerceClient {
  readonly sync: SyncGroup;
  readonly analytics: AnalyticsGroup;
  readonly customers: CustomersGroup;
  readonly settings: SettingsGroup;
  readonly reports: ReportsGroup;
  readonly campaigns: CampaignsGroup;
  readonly flows: FlowsGroup;
  readonly auth: AuthGroup;

  constructor(options: PulseCommerceClientOptions) {
    const client = new BaseClient(options);
    this.sync = new SyncGroup(client);
    this.analytics = new AnalyticsGroup(client);
    this.customers = new CustomersGroup(client);
    this.settings = new SettingsGroup(client);
    this.reports = new ReportsGroup(client);
    this.campaigns = new CampaignsGroup(client);
    this.flows = new FlowsGroup(client);
    this.auth = new AuthGroup(client);
  }
}
