import type { BaseClient } from "../client.js";
import type { DeviceLoginPoll, DeviceLoginStart, Scope } from "../types.js";

/**
 * Device-authorization login — the same shape `gh`/`vercel`/`doctl` use.
 * Both routes are public: there is no key to send yet, that's the point.
 */
export class AuthGroup {
  constructor(private readonly client: BaseClient) {}

  /** POST /api/cli/auth/start */
  startDeviceLogin(scopes: Scope[] = ["read", "write"]): Promise<DeviceLoginStart> {
    return this.client.request("/api/cli/auth/start", {
      method: "POST",
      body: { scopes },
      requireAuth: false,
    });
  }

  /** POST /api/cli/auth/poll — call on the interval `startDeviceLogin()` returned. */
  pollDeviceLogin(deviceCode: string): Promise<DeviceLoginPoll> {
    return this.client.request("/api/cli/auth/poll", {
      method: "POST",
      body: { deviceCode },
      requireAuth: false,
    });
  }
}
