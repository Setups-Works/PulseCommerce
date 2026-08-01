/**
 * Turning a WooCommerce billing phone into a WhatsApp chat id.
 *
 * Checkout fields are free text, so what arrives is inconsistent: spaces,
 * dashes, brackets, a national trunk zero, sometimes a country code and
 * sometimes not. On the store this was built against, every sampled order had a
 * bare ten-digit Indian number with no country code at all — which is exactly
 * the case that silently sends to the wrong person if you guess badly.
 *
 * The rule here is conservative: only produce a chat id when the result is
 * plausibly a real subscriber number, and return null otherwise. A recipient
 * dropped for being unparseable is recoverable; a message delivered to a
 * stranger is not.
 */

/** WhatsApp addresses individuals as <country code><number>@c.us. */
const INDIVIDUAL_SUFFIX = "@c.us";

/**
 * Dial codes for the countries a store is most likely to see, keyed by the
 * ISO-3166 alpha-2 code WooCommerce puts in billing.country. Used only when the
 * number itself carries no country code. Anything not listed falls back to the
 * store's configured default.
 */
const DIAL_CODES: Record<string, string> = {
  IN: "91",
  US: "1",
  CA: "1",
  GB: "44",
  AU: "61",
  NZ: "64",
  AE: "971",
  SA: "966",
  SG: "65",
  MY: "60",
  LK: "94",
  BD: "880",
  NP: "977",
  PK: "92",
  ZA: "27",
  DE: "49",
  FR: "33",
  IT: "39",
  ES: "34",
  NL: "31",
  IE: "353",
  JP: "81",
  CN: "86",
  ID: "62",
  PH: "63",
  TH: "66",
  BR: "55",
  MX: "52",
};

/**
 * Total digit bounds for an E.164 subscriber number including its country code.
 * The ITU maximum is 15; the floor rules out obvious junk such as a landline
 * extension typed into the mobile field.
 */
const MIN_E164_DIGITS = 8;
const MAX_E164_DIGITS = 15;

export interface NormaliseOptions {
  /** Dial code to assume when the number carries none, e.g. "91". */
  defaultDialCode: string;
  /** ISO-3166 alpha-2 from the customer's billing address, when known. */
  country?: string;
}

export interface NormalisedPhone {
  /** Digits only, country code included. */
  e164: string;
  /** Ready to hand to OpenWA. */
  chatId: string;
}

/**
 * Best-effort conversion of a raw billing phone to a WhatsApp chat id.
 * Returns null when the input cannot be trusted to address one person.
 */
export function normalisePhone(
  raw: string | null | undefined,
  options: NormaliseOptions,
): NormalisedPhone | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // A leading + means the country code is already present and must be believed
  // rather than inferred. Note this before stripping punctuation.
  const explicitlyInternational = trimmed.startsWith("+") || trimmed.startsWith("00");

  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  // "00" is the international prefix in much of the world; drop it so what
  // remains starts at the country code.
  if (trimmed.startsWith("00")) digits = digits.slice(2);

  const dialCode = resolveDialCode(options);

  if (!explicitlyInternational) {
    // A single leading zero is a national trunk prefix, not part of the
    // subscriber number, and must go before any country code is added.
    if (digits.length > 10 && digits.startsWith("0")) {
      digits = digits.replace(/^0+/, "");
    }

    // Already carries the country code (a ten-digit Indian number prefixed with
    // 91 reads as twelve digits), so prefixing again would corrupt it.
    if (!dialCode || !digits.startsWith(dialCode)) {
      // Only prefix something that looks like a bare national number. A longer
      // string starting with some other country code is left alone rather than
      // mangled.
      if (dialCode && digits.length <= 10) {
        digits = `${dialCode}${digits}`;
      }
    }
  }

  if (digits.length < MIN_E164_DIGITS || digits.length > MAX_E164_DIGITS) return null;
  // A number that is all one repeated digit is placeholder junk, not a person.
  if (/^(\d)\1+$/.test(digits)) return null;

  return { e164: digits, chatId: `${digits}${INDIVIDUAL_SUFFIX}` };
}

function resolveDialCode(options: NormaliseOptions): string {
  const fromCountry = options.country ? DIAL_CODES[options.country.toUpperCase()] : undefined;
  return (fromCountry ?? options.defaultDialCode ?? "").replace(/\D/g, "");
}

/** Masks a number for display and logs: 9198••••4698. */
export function maskPhone(e164: string): string {
  if (e164.length <= 6) return "•".repeat(e164.length);
  return `${e164.slice(0, 4)}${"•".repeat(Math.max(0, e164.length - 8))}${e164.slice(-4)}`;
}

/** The dial code a store should default to, inferred from its currency. */
export function dialCodeForCurrency(currency: string): string {
  const map: Record<string, string> = {
    INR: "91",
    USD: "1",
    GBP: "44",
    AUD: "61",
    NZD: "64",
    AED: "971",
    SAR: "966",
    SGD: "65",
    MYR: "60",
    LKR: "94",
    BDT: "880",
    NPR: "977",
    PKR: "92",
    ZAR: "27",
    EUR: "",
    CAD: "1",
    JPY: "81",
    CNY: "86",
    IDR: "62",
    PHP: "63",
    THB: "66",
    BRL: "55",
    MXN: "52",
  };
  // The euro spans too many dial codes to guess one, so it deliberately yields
  // nothing and forces the setting to be chosen explicitly.
  return map[currency.toUpperCase()] ?? "";
}
