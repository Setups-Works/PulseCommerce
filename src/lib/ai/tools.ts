import { z } from "zod";

/*
 * No numeric or boolean parameters anywhere in this file, deliberately.
 *
 * Groq validates each tool call against these schemas before we ever see it.
 * A strict `number` fails when the model sends "10" as text, which it often
 * does. Widening to a union of number-or-string fixed that and broke something
 * worse: the model started failing to produce a call at all ("Failed to call a
 * function"), because anyOf schemas confuse it.
 *
 * So the ambiguity is removed rather than tolerated. Counts have fixed sensible
 * defaults, choices are enums, and the few genuine numbers are strings that the
 * executor coerces. Strings and enums are the two shapes every model gets right.
 */

/**
 * What the assistant is allowed to do.
 *
 * Split in two, and the split is the whole safety model.
 *
 * **Reads** run on the server the moment the model asks for them. They touch
 * the cached snapshot and the gateway's status; none of them changes anything,
 * so there is nothing to approve.
 *
 * **Actions** are never executed by the model. The model can only *propose*
 * one; it comes back to the browser as a card that a person approves or
 * rejects, and approving calls the same REST endpoint a human would have used,
 * with every guard that endpoint already has. The model holds no power of its
 * own — it drafts, a person signs.
 *
 * Deliberately absent: starting a broadcast. It is the one action that can
 * message thousands of people at once, it cannot be recalled, and no phrasing
 * of a prompt should be able to reach it. Audiences are sent to from the
 * campaigns screen, by a person, behind a typed confirmation.
 */

export const READ_TOOLS = [
  {
    name: "get_analytics",
    description:
      "Store KPIs: revenue, orders, AOV, customers, repeat rate, refunds, each with " +
      "its previous-period comparison. Use for any 'how are we doing' question.",
    schema: z.object({
      from: z.string().optional().describe("ISO date, inclusive. Omit for the default window."),
      to: z.string().optional().describe("ISO date, inclusive."),
    }),
  },
  {
    name: "get_customer_segments",
    description:
      "RFM segments and value tiers: customers and revenue in each.",
    schema: z.object({}),
  },
  {
    name: "get_top_customers",
    description:
      "Leading customers with orders, spend, segment, churn risk and a customerKey. " +
      "sortBy=spend for 'best/most valuable'; sortBy=orders for 'most ordered/buys " +
      "most often' — usually different people. No phone numbers or emails.",
    schema: z.object({
      sortBy: z.enum(["spend", "orders"]).optional().describe("Ranking. Defaults to spend."),
      size: z.enum(["one", "few", "many"]).optional().describe("one=1, few=5, many=25."),
    }),
  },
  {
    name: "get_products",
    description:
      "Product performance: revenue, units, refund rate, ABC class.",
    schema: z.object({
      rank: z.enum(["best", "worst"]).optional().describe("Best sellers or slow movers."),
      size: z.enum(["one", "few", "many"]).optional().describe("one=1, few=5, many=25."),
    }),
  },
  {
    name: "find_product",
    description:
      "Find a real product by name, SKU or category; returns its buy link and photo " +
      "URL. MUST be called before proposing any message that names, links to or " +
      "pictures a product. Its URLs are the only real ones you have.",
    schema: z.object({
      query: z.string().describe("Part of the product name, SKU or category."),
    }),
  },
  {
    name: "get_inventory_risk",
    description:
      "Products out of stock, critical or low, with days of cover.",
    schema: z.object({}),
  },
  {
    name: "get_audience_size",
    description:
      "How many customers match filters and how many are reachable on WhatsApp. " +
      "Sends nothing. Call before quoting any audience number.",
    schema: z.object({
      segments: z.array(z.string()).optional().describe("RFM segment names."),
      tiers: z.array(z.string()).optional().describe("VIP, High, Mid, Low, One-time."),
      minOrders: z.string().optional().describe('A whole number as text, e.g. "3".'),
      minSpend: z.string().optional().describe('A number as text, e.g. "5000".'),
      churnRiskMin: z.string().optional().describe('0 to 1 as text, e.g. "0.65".'),
      recencyMin: z.string().optional().describe('Days since last order, as text.'),
    }),
  },
  {
    name: "get_flows",
    description:
      "Automated flows: name, id, status, steps, how many are in each.",
    schema: z.object({}),
  },
  {
    name: "get_menu",
    description:
      "The inbound menu bot: trigger, greeting, options, and whether it is on.",
    schema: z.object({}),
  },
  {
    name: "get_whatsapp_status",
    description:
      "Whether the WhatsApp gateway is connected and able to send.",
    schema: z.object({}),
  },
] as const;

/**
 * Actions. Proposed by the model, executed only after a person approves.
 *
 * Each carries the endpoint and payload the browser will call on approval, so
 * what is approved is exactly what runs — there is no second interpretation
 * step between the card a person reads and the request that goes out.
 */
export const ACTION_TOOLS = [
  {
    name: "propose_test_message",
    description:
      "Propose sending one message to a phone number the operator typed. For tests. " +
      "Cannot reach a customer list.",
    schema: z.object({
      phone: z.string().describe("The number to send to, as the operator gave it."),
      text: z.string().describe("The message body. Template variables are not resolved here."),
      imageUrl: z
        .string()
        .optional()
        .describe("A photo URL from find_product. Never invent one; omit if you have none."),
    }),
  },
  {
    name: "propose_customer_message",
    description:
      "Propose messaging ONE customer by the customerKey from get_top_customers. " +
      "Their number is resolved server-side and never shown to you.",
    schema: z.object({
      customerKey: z.string().describe("The key from get_top_customers. Not a phone number."),
      customerName: z.string().describe("Their name, for the approval card."),
      text: z.string().describe("The message body."),
      productUrl: z.string().optional().describe("A buy link from find_product. Never invented."),
      imageUrl: z.string().optional().describe("A photo URL from find_product. Never invented."),
    }),
  },
  {
    name: "propose_customer_batch",
    description:
      "Propose messaging a named list of customers you have already read — e.g. the " +
      "top customers from get_top_customers. Every recipient is listed on the approval " +
      "card by name and approved together. Use for 'message my top 5 customers'. " +
      "Maximum 25; this is not a way to reach the whole customer base.",
    schema: z.object({
      customers: z
        .array(z.object({ customerKey: z.string(), name: z.string() }))
        .max(25)
        .describe("From get_top_customers. Keys, never phone numbers."),
      text: z.string().describe("The message body, the same for everyone."),
      productUrl: z
        .string()
        .optional()
        .describe("REQUIRED when the message is about a product: the productUrl from find_product."),
      imageUrl: z
        .string()
        .optional()
        .describe("REQUIRED when the message is about a product: the imageUrl from find_product."),
      reason: z.string().describe("Who these are and why, for the approval card."),
    }),
  },
  {
    name: "propose_report",
    description:
      "Propose generating a PDF, Excel or CSV report over a date range. Use when " +
      "asked for a report, a summary document, or 'send me a PDF'. Approving " +
      "downloads the file; nothing is emailed.",
    schema: z.object({
      format: z.enum(["pdf", "xlsx", "csv"]).describe("pdf unless asked otherwise."),
      reports: z
        .array(
          z.enum([
            "executive", "customers", "segments", "products", "categories",
            "orders", "cohorts", "geography", "operations", "forecast",
          ]),
        )
        .describe(
          "Which sections. 'executive' for an overview, 'customers' for a customer " +
            "list including the top ones by value, 'products' for the catalogue.",
        ),
      from: z.string().optional().describe("ISO date. Omit for the current window."),
      to: z.string().optional().describe("ISO date."),
      limit: z
        .string()
        .optional()
        .describe('Keep only the leading rows, as text — "10" for "my top 10 customers". Omit for everything.'),
      reason: z.string().describe("What the report covers, for the approval card."),
    }),
  },
  {
    name: "propose_menu_toggle",
    description:
      "Propose turning the menu bot on or off.",
    schema: z.object({
      enabled: z.boolean(),
      reason: z.string().describe("Why, in one sentence, for the approval card."),
    }),
  },
  {
    name: "propose_flow_status",
    description:
      "Propose starting, pausing or drafting an existing flow.",
    schema: z.object({
      flowId: z.string(),
      status: z.enum(["active", "paused", "draft"]),
      reason: z.string().describe("Why, in one sentence, for the approval card."),
    }),
  },
  {
    name: "propose_menu_update",
    description:
      "Propose a new menu: trigger, greeting and options.",
    schema: z.object({
      trigger: z.string(),
      greeting: z.string(),
      options: z
        .array(z.object({ key: z.string(), text: z.string() }))
        .describe("Top-level options in order. Keys are renumbered on save."),
    }),
  },
] as const;

export type ReadToolName = (typeof READ_TOOLS)[number]["name"];
export type ActionToolName = (typeof ACTION_TOOLS)[number]["name"];

export const ACTION_TOOL_NAMES: string[] = ACTION_TOOLS.map((t) => t.name);

/**
 * Words that make a tool worth offering.
 *
 * Every schema and description rides on every request, and the free tier meters
 * tokens per minute — the full set was 4,400 tokens, so one question used more
 * than half a minute's budget and a follow-up failed outright. Sending only
 * what the question could plausibly need brings a request to roughly a third of
 * that.
 *
 * A tool that is not offered simply is not used; the cost of a bad guess is a
 * rephrased question, where the cost of sending everything was no answer at all.
 */
const RELEVANCE: Record<string, RegExp> = {
  get_analytics: /revenue|sales|order|aov|perform|month|week|compare|growth|trend|how are|doing|summar/i,
  get_customer_segments: /segment|tier|rfm|churn|risk|loyal|vip|cohort|who are|customer base|summar/i,
  get_top_customers: /customer|buyer|top|best|spend|most order|loyal|vip|churn/i,
  get_products: /product|sku|catalog|best sell|slow|refund|category|item|summar/i,
  find_product: /product|sku|item|catalog|photo|image|link|about the/i,
  get_inventory_risk: /stock|inventory|out of|restock|reorder|run out|cover|summar/i,
  get_audience_size: /audience|how many|reach|segment|campaign|target|send|message/i,
  get_flows: /flow|sequence|automat|drip|start|pause/i,
  get_menu: /menu|auto.?reply|greeting|trigger|bot|inbound/i,
  get_whatsapp_status: /whatsapp|gateway|connect|linked|session|send/i,
  propose_test_message: /send|test|message|msg|whatsapp|text|draft|notify/i,
  propose_customer_message: /send|message|customer|whatsapp|reorder|notify/i,
  propose_customer_batch: /send|message|customers|top|batch|everyone in|these|notify/i,
  propose_report: /report|pdf|excel|csv|export|document|download/i,
  propose_menu_toggle: /menu|auto.?reply|bot|turn (on|off)|enable|disable/i,
  propose_menu_update: /menu|greeting|trigger|option|rewrite|auto.?reply/i,
  propose_flow_status: /flow|start|pause|resume|activate|draft/i,
};

/** At most this many tools per request, keeping the payload predictable. */
const MAX_TOOLS = 8;

/**
 * The tools worth offering for one question.
 *
 * Falls back to the core analytics reads when nothing matches, so a vague
 * question still gets an answer rather than a model with no way to look
 * anything up.
 */
export function pickTools(text: string) {
  const all = [...READ_TOOLS, ...ACTION_TOOLS];
  const matched = all.filter((t) => RELEVANCE[t.name]?.test(text));

  if (matched.length === 0) {
    return all.filter((t) =>
      ["get_analytics", "get_customer_segments", "get_products", "get_inventory_risk"].includes(
        t.name,
      ),
    );
  }

  // Reads first: a model offered an action and no way to check its facts will
  // propose one built on nothing.
  const reads = matched.filter((t) => !t.name.startsWith("propose_"));
  const actions = matched.filter((t) => t.name.startsWith("propose_"));
  return [...reads, ...actions].slice(0, MAX_TOOLS);
}

/**
 * The instructions the model works under.
 *
 * Written to be specific about the two things that go wrong with an assistant
 * over a real business: inventing numbers, and being agreeable about sending.
 */
export const SYSTEM_PROMPT = `You are the assistant inside PulseCommerce, an analytics and WhatsApp platform for a
WooCommerce store. You are talking to the person who runs the store.

ANSWERING
- Never state a figure you have not read from a tool in this conversation. Call the
  tool, or say you cannot get it.
- Currency is rupees; write large numbers readably (₹70.7L). Be brief.

URLS
- Never write a URL a tool did not give you. No example.com, no guessed links or
  image addresses. Call find_product first and use exactly what it returns; if it
  finds nothing, say so and propose the message without a link or image.

LIMITS
- You cannot send to an audience and have no tool for it. If asked to message all
  customers, say a broadcast starts from the Campaigns screen, and offer to draft
  the message and check the audience size instead.
- You never see phone numbers. Address a customer by their customerKey.
- Do not invent customer names, orders or revenue.

PROPOSING
- Anything that sends or changes something is a proposal: call the propose_* tool,
  then say in one sentence what it will do. Never claim it is done — a person must
  approve it.
- Call get_audience_size before quoting any audience number.
- To message several named customers, call get_top_customers first, then
  propose_customer_batch with the customerKeys it returned. Never guess a key.
- If the message is about a product, call find_product and pass BOTH its
  imageUrl and productUrl into the proposal. A product message without its
  photo and link is not what was asked for.

If no store is connected or the gateway is not linked, say which and stop.`;
