import "server-only";

/**
 * Envelope encryption for store credentials.
 *
 * A WooCommerce consumer secret is a live credential to a merchant's shop. Row
 * level security already stops one tenant reading another's, but the
 * service-role key bypasses RLS by design and a database dump bypasses
 * everything — so the secret is encrypted before it is ever written, and the
 * key lives in the environment rather than in Postgres.
 *
 * AES-256-GCM via Web Crypto: authenticated, so a tampered ciphertext fails to
 * decrypt rather than yielding plausible rubbish, and available on both the
 * Node and Edge runtimes without a second implementation.
 *
 * Format is `iv.ciphertext` in base64url, with GCM's 16-byte tag appended to
 * the ciphertext by the platform. A fresh 12-byte IV per encryption, which is
 * what GCM requires — reusing one across two secrets under the same key leaks
 * both.
 */

const IV_BYTES = 12;

/** Cached: deriving the key on every call is a measurable cost per request. */
let cachedKey: Promise<CryptoKey> | null = null;

function keyMaterial(): string {
  const value = process.env.CREDENTIAL_ENCRYPTION_KEY ?? process.env.AUTH_SECRET ?? "";
  if (value.length < 32) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY is not set (or is shorter than 32 characters). " +
        "Store credentials cannot be encrypted without it. Generate one with `openssl rand -hex 32`.",
    );
  }
  return value;
}

/**
 * True when credentials can be encrypted at all.
 *
 * Checked before offering to connect a store, so the failure is a clear
 * message at setup rather than an exception halfway through an OAuth return
 * with a live credential in hand and nowhere safe to put it.
 */
export function encryptionConfigured(): boolean {
  try {
    keyMaterial();
    return true;
  } catch {
    return false;
  }
}

async function getKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    cachedKey = (async () => {
      /*
       * SHA-256 of the passphrase, used as the raw AES key.
       *
       * Not PBKDF2 or Argon2, and deliberately so: those exist to make
       * *guessing* expensive, which matters for user-chosen passwords. This
       * key is a 32-byte random value from `openssl rand`, so there is nothing
       * to guess and stretching it would only add latency to every request.
       */
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(keyMaterial()),
      );
      return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
        "encrypt",
        "decrypt",
      ]);
    })();
  }
  return cachedKey;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64(value: string): ArrayBuffer {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  // The buffer rather than the view: TS's BufferSource requires an
  // ArrayBuffer-backed ArrayBufferView, and a freshly decoded Uint8Array is
  // typed as ArrayBufferLike, which could be a SharedArrayBuffer.
  return bytes.buffer;
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await getKey(),
    new TextEncoder().encode(plaintext),
  );
  return `${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`;
}

/**
 * Returns null rather than throwing on a value that will not decrypt.
 *
 * The realistic cause is a rotated encryption key, and the useful response to
 * that is "this store needs reconnecting" on one merchant's settings page —
 * not a 500 that takes down every screen for everyone.
 */
export async function decryptSecret(payload: string): Promise<string | null> {
  try {
    const [ivPart, dataPart] = payload.split(".");
    if (!ivPart || !dataPart) return null;

    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(ivPart) },
      await getKey(),
      fromBase64(dataPart),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}
