import type { BaseClient } from "../client.js";
import type { SettingsState } from "../types.js";

export class SettingsGroup {
  constructor(private readonly client: BaseClient) {}

  /** GET /api/settings */
  get(): Promise<SettingsState> {
    return this.client.request("/api/settings");
  }
}
