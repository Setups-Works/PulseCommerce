/**
 * The frequently-asked questions, in one place.
 *
 * Shared by /pricing and the landing page, and by the FAQPage JSON-LD in
 * src/lib/marketing/schema.ts. That last one is the reason this list is data
 * rather than markup: structured data that disagrees with the visible answer
 * is a search penalty, and the only way to guarantee they agree is for both to
 * read the same array.
 */

export interface FaqEntry {
  question: string;
  answer: string;
}

export const FAQ: FaqEntry[] = [
  {
    question: "What access does it need to my store?",
    answer:
      "Read-only, approved by you inside your own WordPress admin through WooCommerce's app-authorization screen. No password is shared and no key is emailed. The one thing written back is a coupon, and only when you create one.",
  },
  {
    question: "Where does my customer data go?",
    answer:
      "Nowhere. Orders are cached on your own deployment and every metric is computed from that cache. Phone numbers are never sent to the browser and are resolved server-side at the moment a message is sent.",
  },
  {
    question: "Can the assistant message my customers on its own?",
    answer:
      "No. It reads freely and changes nothing. Sending anything arrives as a card you approve, and approving runs the same guarded route a person would use. There is no tool for messaging your whole customer base.",
  },
  {
    question: "How long does the first load take?",
    answer:
      "One pull of your full order history, which takes a few minutes on a large store. After that every figure is instant, including changing the date range, because nothing is fetched again.",
  },
  {
    question: "What if WhatsApp restricts my number?",
    answer:
      "On the self-hosted route that is a real risk, which is why a dedicated number is essential — never your main business line. The Cloud API route removes the risk and adds a per-conversation charge instead.",
  },
  {
    question: "Is Shopify supported?",
    answer:
      "Not yet. The engine reads a normalised snapshot rather than WooCommerce directly, so adding a platform is an adapter rather than a rewrite — but it is honest to say it does not exist today.",
  },
  {
    question: "Do I pay per message?",
    answer:
      "Not to us, on any tier. If you run your own WhatsApp host there is no per-message fee at all. If you use the official Cloud API, Meta charges you per conversation directly.",
  },
  {
    question: "Can I cancel?",
    answer:
      "Yes, at any time, and disconnecting a store deletes its credentials and every cached order with it.",
  },
];

/** The subset the landing page shows. The rest live on /pricing. */
export const LANDING_FAQ = FAQ.slice(0, 6);
