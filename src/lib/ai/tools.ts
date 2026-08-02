import { z } from "zod";

/*
 * Models routinely send "10" where a number was asked for, and Groq validates
 * the call against this schema before it ever reaches us — so a strict number
 * type turns a perfectly good tool call into "expected number, but got string"
 * and the turn dies. These accept either and the executor coerces, which costs
 * nothing and removes a whole class of failure.
 */
const loose = {
  number: () => z.union([z.number(), z.string()]),
  boolean: () => z.union([z.boolean(), z.string()]),
};

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
      "Headline metrics for the connected store: net revenue, orders, average order " +
      "value, customer count, repeat rate, cancellation rate, and the change against " +
      "the previous equal-length period. Use this for any question about how the " +
      "business is performing.",
    schema: z.object({
      from: z.string().optional().describe("ISO date, inclusive. Omit for the default window."),
      to: z.string().optional().describe("ISO date, inclusive."),
    }),
  },
  {
    name: "get_customer_segments",
    description:
      "RFM segments and value tiers with how many customers and how much revenue sit " +
      "in each. Use for questions about who the customers are, who is at risk, or " +
      "where the revenue is concentrated.",
    schema: z.object({}),
  },
  {
    name: "get_top_customers",
    description:
      "The highest-value customers, with orders, spend, segment and churn risk. Never " +
      "returns phone numbers or email addresses.",
    schema: z.object({
      limit: loose.number().optional().describe("How many to return. Up to 50."),
    }),
  },
  {
    name: "get_products",
    description:
      "Product performance: revenue, units, refund rate and ABC class per product, " +
      "best sellers and slow movers.",
    schema: z.object({
      limit: loose.number().optional().describe("How many to return. Up to 50."),
      slowMovers: loose.boolean().optional().describe("Return the worst performers instead."),
    }),
  },
  {
    name: "find_product",
    description:
      "Look up a real product in the catalogue by name, SKU or category. Returns its " +
      "exact name, its buy link and its photo URL. You MUST call this before " +
      "proposing any message that mentions a product, links to one, or attaches an " +
      "image — the URLs it returns are the only real ones you have.",
    schema: z.object({
      query: z.string().describe("Part of the product name, SKU or category."),
    }),
  },
  {
    name: "get_inventory_risk",
    description:
      "Products that are out of stock, critical or low, with days of cover and the " +
      "revenue at risk behind each.",
    schema: z.object({}),
  },
  {
    name: "get_audience_size",
    description:
      "How many customers match a set of filters, and how many of those are reachable " +
      "on WhatsApp. Resolves the real list and sends nothing. Use this before " +
      "proposing any campaign, so the numbers quoted are real.",
    schema: z.object({
      segments: z.array(z.string()).optional().describe("RFM segment names."),
      tiers: z.array(z.string()).optional().describe("VIP, High, Mid, Low, One-time."),
      minOrders: loose.number().nullish(),
      minSpend: loose.number().nullish(),
      churnRiskMin: loose.number().nullish().describe("0 to 1."),
      recencyMin: loose.number().nullish().describe("Days since last order, lower bound."),
    }),
  },
  {
    name: "get_flows",
    description:
      "Every automated flow: its name, status, step count, how many customers are in " +
      "it, and what it has sent.",
    schema: z.object({}),
  },
  {
    name: "get_menu",
    description:
      "The inbound menu bot: its trigger word, greeting, options, and whether it is " +
      "currently answering customers.",
    schema: z.object({}),
  },
  {
    name: "get_whatsapp_status",
    description:
      "Whether the WhatsApp gateway is connected and its session is able to send.",
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
      "Propose sending one WhatsApp message to a single phone number typed by the " +
      "operator, for testing. Cannot reach a customer list. Use this when asked to " +
      "'send me' or 'test' a message.",
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
      "Propose sending a WhatsApp message to ONE named customer, identified by the " +
      "customerKey returned by get_top_customers. Their phone number is resolved on " +
      "the server at send time and is never shown to you. Use for 'message my top " +
      "customer' or 'ask this customer to reorder'.",
    schema: z.object({
      customerKey: z.string().describe("The key from get_top_customers. Not a phone number."),
      customerName: z.string().describe("Their name, for the approval card."),
      text: z.string().describe("The message body."),
      productUrl: z.string().optional().describe("A buy link from find_product. Never invented."),
      imageUrl: z.string().optional().describe("A photo URL from find_product. Never invented."),
    }),
  },
  {
    name: "propose_menu_toggle",
    description:
      "Propose turning the inbound menu bot on or off. Turning it on means every " +
      "customer who sends the trigger word gets an automatic reply.",
    schema: z.object({
      enabled: z.boolean(),
      reason: z.string().describe("Why, in one sentence, for the approval card."),
    }),
  },
  {
    name: "propose_flow_status",
    description:
      "Propose starting, pausing or drafting an existing flow. Starting a flow means " +
      "it begins messaging everyone who matches its entry audience.",
    schema: z.object({
      flowId: z.string(),
      status: z.enum(["active", "paused", "draft"]),
      reason: z.string().describe("Why, in one sentence, for the approval card."),
    }),
  },
  {
    name: "propose_menu_update",
    description:
      "Propose a new menu for the inbound bot: trigger word, greeting and options. " +
      "Use when asked to write or change what customers see when they message first.",
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
 * The instructions the model works under.
 *
 * Written to be specific about the two things that go wrong with an assistant
 * over a real business: inventing numbers, and being agreeable about sending.
 */
export const SYSTEM_PROMPT = `You are the assistant inside PulseCommerce, an analytics and WhatsApp
platform for a WooCommerce store. You are talking to the person who runs the store.

HOW YOU ANSWER
- Never state a figure you have not read from a tool in this conversation. If you
  do not have it, call the tool. If a tool cannot give it, say so plainly.
- Prefer one concrete number with its context over a paragraph of hedging.
- Currency is Indian rupees. Write large numbers readably (₹70.7L, not 7070000).
- Be brief. This is a working tool, not a chat companion.

URLS AND PRODUCTS
- Never write a URL you did not receive from a tool. No example.com, no guessed
  product links, no placeholder image addresses. If you want to mention or
  attach a product, call find_product first and use exactly what it returns.
- If find_product returns nothing, say the product was not found and propose the
  message without a link or image rather than inventing either.

WHAT YOU MUST NOT DO
- Do not invent customer names, phone numbers, order counts or revenue.
- You cannot send to an audience. There is no tool for it and you must not imply
  you have one. If asked to "message all customers", explain that a broadcast is
  started from the Campaigns screen by a person, and offer to draft the message
  and check the audience size instead.
- Phone numbers are never available to you. Do not claim to know one.

PROPOSING ACTIONS
- Anything that changes something or sends a message is a proposal. Call the
  matching propose_* tool, then tell the operator in one sentence what you have
  proposed and what it will do. Do not claim it is done — a person still has to
  approve it.
- Before proposing anything involving an audience, call get_audience_size so the
  numbers you quote are real ones.

If the store is not connected, or the gateway is not linked, say which and stop
rather than guessing.`;
