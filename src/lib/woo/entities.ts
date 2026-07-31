/**
 * WooCommerce returns product, category and store names HTML-encoded — a
 * category called "Face & Body Oil" arrives as "Face &amp; Body Oil". Left
 * alone, that leaks into charts, tables, PDFs and CSV exports.
 */

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  trade: "™",
  reg: "®",
  copy: "©",
  deg: "°",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
  szlig: "ß",
  ntilde: "ñ",
};

export function decodeEntities(input: string): string {
  if (!input || !input.includes("&")) return input;

  // Woo sometimes double-encodes ("&amp;amp;"), so decode until it settles.
  let out = input;
  for (let pass = 0; pass < 3; pass++) {
    const next = out.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, entity: string) => {
      if (entity[0] === "#") {
        const code =
          entity[1] === "x" || entity[1] === "X"
            ? Number.parseInt(entity.slice(2), 16)
            : Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
      }
      return NAMED[entity.toLowerCase()] ?? match;
    });
    if (next === out) break;
    out = next;
  }
  return out;
}
