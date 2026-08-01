/**
 * Message templates and the variables they can use.
 *
 * Every variable resolves per recipient from that customer's own order history,
 * so a "reorder" message names the thing they actually bought and links to it
 * on the store rather than to a generic page. Nothing here invents a product: a
 * variable with no value for a given customer collapses, and the surrounding
 * punctuation is tidied so the sentence still reads.
 */

/** What a template needs from a customer before it makes sense to send. */
export type TemplateRequirement = "none" | "product" | "category";

export interface MessageTemplate {
  id: string;
  name: string;
  /** What this is for, so the choice is not made on the title alone. */
  purpose: string;
  /** Which audience it belongs with, shown as a hint next to the picker. */
  suggestedAudience: string;
  body: string;
  /** Attaching the product photo turns this into an image message. */
  withImage: boolean;
  requires: TemplateRequirement;
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "reorder",
    name: "Reorder what they bought",
    purpose:
      "Names the product they actually bought and links straight to it. The single highest-converting message for a store with consumable products.",
    suggestedAudience: "Customers whose usual reorder gap has passed",
    body:
      "Hi {{name}}, it has been a while since your last {{product}}.\n\n" +
      "Running low? You can reorder it here:\n{{product_url}}\n\n" +
      "— {{store}}",
    withImage: true,
    requires: "product",
  },
  {
    id: "category-restock",
    name: "New in a category they buy",
    purpose:
      "Reaches people through the category they already shop, rather than announcing to everyone and hoping.",
    suggestedAudience: "Customers who bought from one category",
    body:
      "Hi {{name}}, we have new arrivals in {{category}} — the range you already shop with us.\n\n" +
      "Have a look:\n{{product_url}}\n\n" +
      "— {{store}}",
    withImage: true,
    requires: "category",
  },
  {
    id: "winback",
    name: "Win back a lapsed customer",
    purpose:
      "For customers who have gone quiet past their own usual gap. Reactivation costs far less than acquiring someone equivalent.",
    suggestedAudience: "At Risk, Hibernating, or high churn risk",
    body:
      "Hi {{name}}, we have not seen you since {{last_order}} and wanted to check in.\n\n" +
      "Your {{product}} is still one of our most-loved products, and it is here whenever you need it:\n{{product_url}}\n\n" +
      "— {{store}}",
    withImage: false,
    requires: "product",
  },
  {
    id: "second-order",
    name: "Nudge a one-time buyer",
    purpose:
      "The jump from one order to two is the biggest single lift in lifetime value. These customers are still warm.",
    suggestedAudience: "One-time buyers, bought recently",
    body:
      "Hi {{name}}, thank you for trying our {{product}}.\n\n" +
      "How did you get on with it? If it worked for you, it is here whenever you want more:\n{{product_url}}\n\n" +
      "— {{store}}",
    withImage: false,
    requires: "product",
  },
  {
    id: "vip",
    name: "Thank a VIP",
    purpose:
      "Recognition for your best customers. Low risk, and the natural audience for early access and referrals.",
    suggestedAudience: "VIP tier, Champions, Loyal",
    body:
      "Hi {{name}}, a quick thank you — you have ordered from us {{orders}} times now, and that means a great deal to a small business.\n\n" +
      "If there is ever anything you need, reply to this message and it comes straight to us.\n\n" +
      "— {{store}}",
    withImage: false,
    requires: "none",
  },
  {
    id: "review",
    name: "Ask for a review",
    purpose:
      "Sent to people who bought and stayed, so the ask lands with customers who are likely to say something good.",
    suggestedAudience: "Repeat customers, recent order",
    body:
      "Hi {{name}}, you have been buying our {{product}} for a while now, and it would help us enormously if you shared what you think of it.\n\n" +
      "You can leave a review here:\n{{product_url}}\n\n" +
      "Thank you — {{store}}",
    withImage: false,
    requires: "product",
  },
  {
    id: "coupon-reorder",
    name: "Coupon + their product",
    purpose:
      "Pairs a discount code with the product that person actually buys, so the offer has something specific to be spent on rather than being a general announcement.",
    suggestedAudience: "Lapsed customers, or one-time buyers worth converting",
    body:
      "Hi {{name}}, here is {{coupon_value}} on your next order of {{product}}.\n\n" +
      "Use code {{coupon}} at checkout:\n{{product_url}}\n\n" +
      "— {{store}}",
    withImage: true,
    requires: "product",
  },
  {
    id: "coupon-offer",
    name: "Coupon, no product",
    purpose:
      "A plain discount announcement for customers with no clear favourite product, or for a store-wide offer.",
    suggestedAudience: "Any audience",
    body:
      "Hi {{name}}, here is {{coupon_value}} on your next order with us.\n\n" +
      "Use code {{coupon}} at checkout.\n\n" +
      "— {{store}}",
    withImage: false,
    requires: "none",
  },
  {
    id: "product-launch",
    name: "Announce one product",
    purpose:
      "Leads with the product itself — its photo, a caption you write, and the buy link. Pick the product above and it fills itself in; use it for a launch, a restock, or a push on one item.",
    suggestedAudience: "Everyone, or anyone who buys the category",
    body:
      "Hi {{name}}, {{product}} is back in stock.\n\n" +
      "{{product_url}}\n\n" +
      "— {{store}}",
    withImage: true,
    requires: "none",
  },
  {
    id: "offer",
    name: "Offer or announcement",
    purpose:
      "A plain campaign message with no product logic. Write your own body; the greeting still personalises.",
    suggestedAudience: "Any audience",
    body: "Hi {{name}},\n\n\n\n— {{store}}",
    withImage: false,
    requires: "none",
  },
];

/** The values a template can draw on for one recipient. */
export interface TemplateVariables {
  name: string;
  coupon: string;
  coupon_value: string;
  product: string;
  product_url: string;
  product_image: string;
  category: string;
  last_order: string;
  orders: string;
  spend: string;
  store: string;
}

export const VARIABLE_HELP: { token: string; describes: string }[] = [
  { token: "{{name}}", describes: "First name, or nothing for a guest checkout with no usable name" },
  { token: "{{product}}", describes: "The product they have spent the most on" },
  { token: "{{product_url}}", describes: "Buy link for that product, from WooCommerce" },
  { token: "{{category}}", describes: "The category that product belongs to" },
  { token: "{{last_order}}", describes: "When they last ordered, e.g. \"12 March\"" },
  { token: "{{orders}}", describes: "How many orders they have placed" },
  { token: "{{spend}}", describes: "What they have spent in total" },
  { token: "{{store}}", describes: "Your store name" },
  { token: "{{coupon}}", describes: "The coupon code you attach to the message" },
  { token: "{{coupon_value}}", describes: "What that coupon is worth, e.g. \"10% off\"" },
];

/**
 * Substitutes variables for one recipient.
 *
 * An unresolved variable is removed rather than left as a literal `{{product}}`
 * or replaced with a guess. The tidy-up afterwards is what stops that leaving
 * "your ," or a line with a dangling colon and no link under it.
 */
export function renderTemplate(body: string, vars: Partial<TemplateVariables>): string {
  const rendered = body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key as keyof TemplateVariables];
    return value ? String(value) : "";
  });

  return (
    rendered
      // "your  soap" -> "your soap", from a collapsed variable mid-sentence.
      .replace(/[^\S\n]{2,}/g, " ")
      // " ," and " ." left where a variable was the last thing before it.
      .replace(/[^\S\n]+([,.!?])/g, "$1")
      // A line that is now just a colon, or a label with nothing after it.
      .replace(/^[^\S\n]*[:—-][^\S\n]*$/gm, "")
      // Three or more blank lines collapse to a paragraph break.
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** Whether a recipient has what a template needs to make sense. */
export function templateApplies(
  template: MessageTemplate,
  vars: Partial<TemplateVariables>,
): boolean {
  if (template.requires === "product") return Boolean(vars.product);
  if (template.requires === "category") return Boolean(vars.category);
  return true;
}
