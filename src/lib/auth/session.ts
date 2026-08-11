/**
 * Signed session cookie.
 *
 * Uses Web Crypto rather than `node:crypto` so the same verify path runs in
 * middleware (Edge runtime) and in route handlers (Node) without a second
 * implementation drifting out of sync.
 */

export const SESSION_COOKIE = "pulse_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionPayload {
  /** How the session was established. */
  via: "woo-auth" | "password";
  /** Store the session is scoped to, when known. */
  storeUrl?: string;
  /** Account the session belongs to. Absent on a legacy APP_PASSWORD session. */
  userId?: string;
  email?: string;
  issuedAt: number;
  expiresAt: number;
}

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (value && value.length >= 16) return value;
  // A weak fallback would silently make sessions forgeable, so refuse instead.
  throw new Error(
    "AUTH_SECRET is not set (or is shorter than 16 characters). Generate one with `openssl rand -hex 32` and add it to .env.local.",
  );
}

/** True when the deployment has auth configured at all. */
export function authConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16);
}

/** True when a password login is available. */
export function passwordConfigured(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

function base64url(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  // Returning the buffer keeps this assignable to BufferSource on every runtime.
  return bytes.buffer;
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

export async function createSession(payload: Omit<SessionPayload, "issuedAt" | "expiresAt">): Promise<string> {
  const now = Date.now();
  const full: SessionPayload = { ...payload, issuedAt: now, expiresAt: now + SESSION_TTL_MS };
  const body = base64url(new TextEncoder().encode(JSON.stringify(full)));
  const signature = await crypto.subtle.sign("HMAC", await key(), new TextEncoder().encode(body));
  return `${body}.${base64url(new Uint8Array(signature))}`;
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await key(),
      fromBase64url(signature),
      new TextEncoder().encode(body),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(new Uint8Array(fromBase64url(body)))) as SessionPayload;
    if (typeof payload.expiresAt !== "number" || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
  // Set on HTTPS deployments; a plain-HTTP localhost dev server would drop it.
  secure: process.env.NODE_ENV === "production",
};

/** Constant-time string compare, so a password check can't be timed. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
