/**
 * State for an in-flight WooCommerce authorization.
 *
 * The flow spans two requests WooCommerce makes independently: a
 * server-to-server POST carrying the credentials, and a browser redirect back
 * to us. Something has to tie them together.
 *
 * That something is a *signed, self-contained token* rather than a server-side
 * record. WooCommerce echoes the `user_id` parameter back on both legs, so the
 * token carries the store URL with it and needs no shared storage — which
 * matters because on serverless the two legs can land on different instances
 * that share no filesystem.
 */

const TTL_MS = 15 * 60 * 1000;

export class MissingAuthSecretError extends Error {
  readonly code = "missing_auth_secret";
  constructor() {
    super(
      "AUTH_SECRET is not set. The authorization flow signs its state token with it, so it is required. Generate one with `openssl rand -hex 32`.",
    );
    this.name = "MissingAuthSecretError";
  }
}

interface StatePayload {
  /** Store being authorized. */
  u: string;
  /** Issued at (ms). */
  t: number;
  /** Random, so two authorizations of the same store differ. */
  n: string;
}

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) throw new MissingAuthSecretError();
  return value;
}

function b64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Builds the state token. Kept compact because WooCommerce round-trips it as a
 * query parameter: the signature is truncated to 16 bytes, which is ample for
 * a token that also expires in 15 minutes.
 */
export async function createState(storeUrl: string): Promise<string> {
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(9)));
  const payload: StatePayload = { u: storeUrl, t: Date.now(), n: nonce };
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", await key(), new TextEncoder().encode(body)),
  ).slice(0, 16);
  return `${body}.${b64url(signature)}`;
}

/** Returns the store URL the token was issued for, or null if it isn't valid. */
export async function verifyState(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  try {
    const expected = new Uint8Array(
      await crypto.subtle.sign("HMAC", await key(), new TextEncoder().encode(body)),
    ).slice(0, 16);

    const provided = fromB64url(signature);
    if (provided.length !== expected.length) return null;

    // Constant-time compare so the signature can't be probed byte by byte.
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ provided[i];
    if (diff !== 0) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as StatePayload;
    if (typeof payload.t !== "number" || Date.now() - payload.t > TTL_MS) return null;
    if (typeof payload.u !== "string" || !payload.u) return null;

    return payload.u;
  } catch {
    return null;
  }
}
