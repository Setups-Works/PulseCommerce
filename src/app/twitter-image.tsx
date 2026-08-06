/**
 * Twitter's card, which is the Open Graph card.
 *
 * Re-exported rather than duplicated: the two are the same 1200×630 image and
 * maintaining a second copy would mean one of them eventually going stale.
 * Next requires the route to exist as its own file convention, so a re-export
 * is the whole of it.
 */
export { default, alt, size, contentType } from "./opengraph-image";
