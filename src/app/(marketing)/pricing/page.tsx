import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Section, SectionHeading } from "@/components/marketing/sections";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "One price for all thirteen modules. Choose how messages are carried: your own WhatsApp host with no per-message fee, or the official Cloud API with delivery backed by Meta.",
};

/**
 * The pricing page.
 *
 * PLACEHOLDER FIGURES. The amounts below are structure, not a commercial
 * decision — set them before this page is public. They live in one array
 * rather than inline in the markup so changing them is a single edit and no
 * price can survive in a second place.
 *
 * Tier names describe store size rather than feature sets, because every tier
 * includes every module. Gating analytics behind a higher tier would mean the
 * product tells a small store less about its customers than it knows, which is
 * the opposite of what it is for.
 */

const PLANS = [
  {
    name: "Starter",
    price: "₹1,499",
    cadence: "per month",
    blurb: "One store, and the full product.",
    highlight: false,
    cta: "Start free",
    href: "/connect",
    limits: ["1 connected store", "Up to 2,000 orders of history", "12 months of history", "Email support"],
  },
  {
    name: "Growth",
    price: "₹3,999",
    cadence: "per month",
    blurb: "The tier most stores settle on.",
    highlight: true,
    cta: "Start free",
    href: "/connect",
    limits: ["3 connected stores", "Up to 50,000 orders of history", "36 months of history", "Priority support"],
  },
  {
    name: "Self-hosted",
    price: "Free",
    cadence: "forever",
    blurb: "Run it on your own infrastructure.",
    highlight: false,
    cta: "Read the docs",
    href: "/api-docs",
    limits: ["Unlimited stores", "Unlimited history", "Your own database", "Community support"],
  },
];

/** Every module, in every tier. The list exists to prove there is no catch. */
const INCLUDED = [
  "Revenue, orders and repeat rate",
  "RFM segmentation and value tiers",
  "Predicted lifetime value",
  "Cohort retention",
  "Acquisition channels",
  "Product performance and ABC classes",
  "Market-basket affinity",
  "Inventory cover and reorder points",
  "B2B account rollups",
  "WhatsApp campaigns",
  "Automated flows",
  "The assistant",
  "Report exports (PDF, Excel, CSV)",
];

const FAQ: [string, string][] = [
  [
    "What access does it need to my store?",
    "Read-only, approved by you inside your own WordPress admin through WooCommerce's app-authorization screen. No password is shared and no key is emailed. The one thing written back is a coupon, and only when you create one.",
  ],
  [
    "Where does my customer data go?",
    "Nowhere. Orders are cached on your own deployment and every metric is computed from that cache. Phone numbers are never sent to the browser and are resolved server-side at the moment a message is sent.",
  ],
  [
    "Can the assistant message my customers on its own?",
    "No. It reads freely and changes nothing. Sending anything arrives as a card you approve, and approving runs the same guarded route a person would use. There is no tool for messaging your whole customer base.",
  ],
  [
    "How long does the first load take?",
    "One pull of your full order history, which takes a few minutes on a large store. After that every figure is instant, including changing the date range, because nothing is fetched again.",
  ],
  [
    "What if WhatsApp restricts my number?",
    "On the self-hosted route that is a real risk, which is why a dedicated number is essential — never your main business line. The Cloud API route removes the risk and adds a per-conversation charge instead.",
  ],
  [
    "Is Shopify supported?",
    "Not yet. The engine reads a normalised snapshot rather than WooCommerce directly, so adding a platform is an adapter rather than a rewrite — but it is honest to say it does not exist today.",
  ],
  [
    "Do I pay per message?",
    "Not to us, on any tier. If you run your own WhatsApp host there is no per-message fee at all. If you use the official Cloud API, Meta charges you per conversation directly.",
  ],
  ["Can I cancel?", "Yes, at any time, and disconnecting a store deletes its credentials and every cached order with it."],
];

export default function PricingPage() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-12 text-center sm:px-6 md:pt-20">
        <Badge variant="outline" className="gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" />
          Every module, every tier
        </Badge>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          One price. No feature gates.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          Tiers are sized by how much history you have, not by what the product will tell you about
          it. A small store gets the same thirteen modules as a large one.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid items-stretch gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <Card key={plan.name} className={cn("flex h-full flex-col", plan.highlight && "border-primary shadow-md")}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {plan.highlight ? <Badge>Most chosen</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.cadence}</span>
                </div>

                <Separator className="my-5" />

                <ul className="space-y-2.5">
                  {plan.limits.map((limit) => (
                    <li key={limit} className="flex gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{limit}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  size="lg"
                  variant={plan.highlight ? "default" : "outline"}
                  asChild
                  className="mt-auto h-10 w-full pt-0 text-sm"
                >
                  <Link href={plan.href}>
                    {plan.cta}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Fourteen days free on every paid tier. No card until you have seen your own data.
        </p>
      </section>

      <Section className="bg-muted/30">
        <SectionHeading
          title="What every tier includes"
          body="All of it. The list is here so nobody has to go looking for the asterisk."
        />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INCLUDED.map((item) => (
            <Card key={item}>
              <CardContent className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-sm">{item}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="delivery">
        <SectionHeading
          title="Two ways to send. Same platform."
          body="The analytics, the flows, the assistant and the inbox are identical either way. The only difference is what carries the messages — and that choice is a genuine trade-off, not an upsell."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader>
              <Badge variant="secondary" className="w-fit">
                Guaranteed delivery
              </Badge>
              <CardTitle className="mt-3 text-lg">Official WhatsApp Cloud API</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Meta&rsquo;s own API. Messages are delivered under their terms, tappable buttons and
                product cards work, and your number cannot be restricted for using it as intended.
              </p>
              <ul className="mt-5 space-y-2.5">
                {["Delivery backed by Meta", "Buttons and product cards available"].map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
                {["Template approval required before sending", "Meta charges per conversation, ongoing"].map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
                    <Minus className="mt-0.5 size-4 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Separator className="my-5 mt-auto" />
              <p className="text-sm font-medium">
                Best when delivery matters more than cost, or you send to people who have not bought
                from you before.
              </p>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <Badge variant="secondary" className="w-fit">
                No per-message fee
              </Badge>
              <CardTitle className="mt-3 text-lg">Your own WhatsApp host</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <p className="text-sm leading-relaxed text-muted-foreground">
                A messaging server on infrastructure you control. Your number, your message history,
                nobody in the middle, and no charge per message however many you send.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  "No per-message cost, ever",
                  "Your number and your history stay yours",
                  "No template approval, no waiting",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
                <li className="flex gap-2.5 text-sm text-muted-foreground">
                  <Minus className="mt-0.5 size-4 shrink-0" />
                  <span>Delivery is not guaranteed; use a dedicated number</span>
                </li>
              </ul>
              <Separator className="my-5 mt-auto" />
              <p className="text-sm font-medium">
                Best for messaging your own past customers at volume, where a per-message fee would
                dominate the cost.
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section id="faq" className="bg-muted/30">
        <SectionHeading title="Everything you need to know" />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {FAQ.map(([question, answer]) => (
            <Card key={question}>
              <CardHeader>
                <CardTitle className="text-base">{question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Fourteen days. Your own data.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-pretty text-muted-foreground">
              Connect a store, see what it says about your customers, and decide after that.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row sm:gap-3">
              <Button size="lg" asChild className="h-10 px-5 text-sm">
                <Link href="/connect">
                  Start free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-10 px-5 text-sm">
                <Link href="/features">See the features</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>
    </main>
  );
}
