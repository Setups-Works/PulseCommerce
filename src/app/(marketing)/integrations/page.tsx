import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Lock, MessageCircle, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Section, SectionHeading } from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "Integrations",
  description:
    "WooCommerce over its own app-authorization flow, read-only. WhatsApp through your own host or the official Cloud API. Shopify next, as an adapter rather than a rewrite.",
};

/**
 * The integrations page.
 *
 * Says plainly what exists and what does not. A roadmap item dressed as a
 * feature costs more trust than the feature would have won, so Shopify is
 * marked as absent in the same weight as WooCommerce is marked as present.
 */

const STACK: [string, string, string][] = [
  ["01", "Your WooCommerce store", "Read over the REST API. One write: coupons."],
  ["02", "PulseCommerce", "One cached snapshot. Every metric derived from it."],
  ["03", "Your own WhatsApp API", "Your server, your number, no per-message fee."],
  ["04", "The model", "Sees counts and names. Never a phone number."],
];

const SCOPES: [string, string, boolean][] = [
  ["Orders", "Read — every line item, total and date", true],
  ["Customers", "Read — names, emails, billing phone", true],
  ["Products", "Read — price, stock, categories, images", true],
  ["Coupons", "Write — only when you create a campaign code", false],
  ["Settings", "Never touched", false],
  ["Themes and plugins", "Never touched", false],
];

export default function IntegrationsPage() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-12 sm:px-6 md:pt-20">
        <Badge variant="outline" className="gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" />
          Connects to what you already run
        </Badge>
        <h1 className="mt-6 max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          One store to connect. Nothing to migrate.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          You approve read-only access inside your own WordPress admin. No password is shared, no key
          is emailed, and disconnecting wipes every cached order.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid items-stretch gap-6 md:grid-cols-2">
          <Card className="flex h-full flex-col">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                  <Store className="size-5 text-primary" />
                </span>
                <Badge variant="secondary">Available now</Badge>
              </div>
              <CardTitle className="mt-3 text-lg">WooCommerce</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Authorised through WooCommerce&rsquo;s own app-authorization screen inside your
                WordPress admin. You approve <b className="text-foreground">read-only</b> access;
                coupons are the single thing written back, and only when you create one.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  "Orders, products, customers, coupons",
                  "One pull, then every metric is instant",
                  "Disconnecting wipes every cached order",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" asChild className="mt-auto h-10 w-full pt-0 text-sm">
                <Link href="/connect">
                  Connect a store
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card id="shopify" className="flex h-full scroll-mt-20 flex-col">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                  <ShoppingBag className="size-5 text-muted-foreground" />
                </span>
                <Badge variant="outline">Not yet built</Badge>
              </div>
              <CardTitle className="mt-3 text-lg">Shopify</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The analytics engine reads a normalised snapshot rather than WooCommerce directly, so
                a second platform is an adapter rather than a rewrite. Every module works unchanged
                once orders arrive in the same shape — but it is honest to say that adapter does not
                exist today.
              </p>
              <p className="mt-4 text-sm font-medium">Want it sooner? Tell us and we will prioritise it.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Section className="bg-muted/30">
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <Badge variant="secondary">Scope</Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Exactly what the key can reach
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              WooCommerce issues the key and delivers it to this app directly, so you never handle a
              secret. The scope is the whole story — there is no path by which this app could change
              your catalogue, your settings or your theme.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              {[
                [Lock, "The key is held in your own storage, never in a browser bundle."],
                [ShieldCheck, "Phone numbers are resolved server-side at send time, never sent to the browser."],
              ].map(([Icon, text]) => {
                const Ico = Icon as typeof Lock;
                return (
                  <Card key={text as string}>
                    <CardContent className="flex items-start gap-3">
                      <Ico className="mt-0.5 size-4 shrink-0 text-primary" />
                      <p className="text-sm">{text as string}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="border-b bg-muted/40 px-4 py-2.5">
              <p className="text-xs font-medium">Permissions granted to PulseCommerce</p>
            </div>
            {SCOPES.map(([resource, detail, granted], i) => (
              <div key={resource}>
                {i > 0 ? <Separator /> : null}
                <div className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md ${
                      granted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {granted ? <Check className="size-3" strokeWidth={3} /> : <Lock className="size-2.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{resource}</span>
                    <span className="block text-xs text-muted-foreground">{detail}</span>
                  </span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </Section>

      <Section id="whatsapp">
        <SectionHeading
          title="Two ways to carry the messages"
          body="Pick one at setup and change it later. Everything above this line works identically either way."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                <MessageCircle className="size-5 text-primary" />
              </span>
              <CardTitle className="mt-3 text-base">Your own WhatsApp host</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                A messaging server on infrastructure you control. No per-message fee, no template
                approval, and your message history never leaves your deployment. Use a dedicated
                number.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                <ShieldCheck className="size-5 text-primary" />
              </span>
              <CardTitle className="mt-3 text-base">Official Cloud API</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Meta&rsquo;s own API. Delivery is backed by them, buttons and product cards work, and
                your number cannot be restricted for using it as intended. Meta charges per
                conversation.
              </p>
            </CardContent>
          </Card>
        </div>
        <Button variant="outline" size="lg" asChild className="mt-6 h-10 px-5 text-sm">
          <Link href="/pricing#delivery">
            Compare the two in detail
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </Section>

      <Section className="bg-muted/30">
        <SectionHeading
          title="Four parts, one product"
          body="Three of them run on infrastructure you control. The fourth never sees a customer."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {STACK.map(([n, title, body]) => (
            <Card key={n}>
              <CardContent className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-xs font-semibold tabular-nums">
                  {n}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Connect in a couple of minutes
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-pretty text-muted-foreground">
              Enter your store address, approve read-only access, and the first pull starts on its
              own.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row sm:gap-3">
              <Button size="lg" asChild className="h-10 px-5 text-sm">
                <Link href="/connect">
                  Connect your store
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-10 px-5 text-sm">
                <Link href="/api-docs">Read the API docs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>
    </main>
  );
}
