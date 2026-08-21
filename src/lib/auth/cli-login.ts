import { db } from "@/lib/db/client";
import { createApiKey, type ApiKeyRecord, type Scope } from "./api-key";

/**
 * Device-authorization login for `pulse login` — the CLI equivalent of
 * clicking "Create key" in Settings, minus the copy-paste. Same shape `gh`,
 * `vercel` and `doctl` use: the CLI gets a code, a human approves it in a
 * browser that's already signed in, the CLI picks up a freshly minted key.
 *
 * ─── Why nothing "approved" is ever stored ─────────────────────────────────
 *
 * Approving in the browser only attaches `user_id` to the row — it does not
 * mint a key. The key is minted inside the first poll that observes
 * `user_id` set, by an UPDATE that claims the row (`status = 'pending' ...
 * RETURNING`) before creating anything. Whichever poll wins that race is the
 * only one that ever sees the key; a second poll finds the row already
 * `completed` and reports "expired". That gives the same guarantee
 * `createApiKey()` already gives the dashboard's own key-creation flow — a
 * secret exists on the wire exactly once — without ever writing a raw key,
 * or even a flag saying one is ready, into a row that sits around waiting to
 * be read.
 */

const TEN_MINUTES_MS = 10 * 60 * 1000;
// Unmistakable even read aloud: no 0/O, 1/I/L, or other easily-confused pair.
const USER_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

function randomToken(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let binary = "";
  for (const b of buf) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomUserCode(): string {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  const chars = Array.from(buf, (b) => USER_CODE_ALPHABET[b % USER_CODE_ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export interface DeviceLoginStart {
  deviceCode: string;
  userCode: string;
  expiresIn: number;
  interval: number;
}

export async function startDeviceLogin(scopes: Scope[]): Promise<DeviceLoginStart> {
  const deviceCode = randomToken(32);
  const userCode = randomUserCode();
  const expiresAt = new Date(Date.now() + TEN_MINUTES_MS);

  await db()`
    insert into cli_auth_requests (device_code, user_code, scopes, expires_at)
    values (${deviceCode}, ${userCode}, ${scopes.length ? scopes : ["read"]}, ${expiresAt})
  `;

  return { deviceCode, userCode, expiresIn: TEN_MINUTES_MS / 1000, interval: 5 };
}

/** Attaches the approving session's account to the pending request. Not the mint step — see the file note above. */
export async function approveDeviceLogin(userCode: string, userId: string): Promise<boolean> {
  const rows = await db()`
    update cli_auth_requests
       set user_id = ${userId}
     where user_code = ${userCode}
       and status = 'pending'
       and user_id is null
       and expires_at > now()
    returning id
  `;
  return rows.length > 0;
}

export async function denyDeviceLogin(userCode: string): Promise<boolean> {
  const rows = await db()`
    update cli_auth_requests
       set status = 'denied'
     where user_code = ${userCode}
       and status = 'pending'
       and expires_at > now()
    returning id
  `;
  return rows.length > 0;
}

export type DeviceLoginPollResult =
  | { status: "pending" }
  | { status: "denied" }
  | { status: "expired" }
  | { status: "approved"; key: string; record: ApiKeyRecord };

export async function pollDeviceLogin(deviceCode: string): Promise<DeviceLoginPollResult> {
  // Claim the row before minting anything. Only whichever call wins this
  // UPDATE proceeds to create a key, so two concurrent polls can never both
  // hand one out for the same login.
  const [claimed] = await db()<{ user_id: string; scopes: Scope[] }[]>`
    update cli_auth_requests
       set status = 'completed'
     where device_code = ${deviceCode}
       and status = 'pending'
       and user_id is not null
       and expires_at > now()
    returning user_id, scopes
  `;

  if (claimed) {
    const { record, key } = await createApiKey("CLI login", claimed.scopes, claimed.user_id);
    return { status: "approved", key, record };
  }

  const [row] = await db()<{ status: string; expires_at: Date }[]>`
    select status, expires_at from cli_auth_requests where device_code = ${deviceCode}
  `;

  if (!row || row.expires_at.getTime() < Date.now() || row.status === "completed") {
    return { status: "expired" };
  }
  if (row.status === "denied") return { status: "denied" };
  return { status: "pending" };
}
