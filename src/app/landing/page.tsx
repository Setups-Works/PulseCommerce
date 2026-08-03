import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  CalendarClock,
  Check,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { NeoBadge, NeoButton, NeoCard, NeoHeading, NeoMark, NeoPanel, NeoShot } from "@/components/neo";

export const metadata: Metadata = {
  title: "PulseCommerce — Analytics and WhatsApp for WooCommerce",
  description:
    "Know who your best customers are, which ones are about to leave, and what they buy — then message them on WhatsApp from the same screen, through a gateway you own.",
};

/**
 * The landing page.
 *
 * Neobrutalist rather than the product's own restrained interface, deliberately:
 * a marketing page has one job, which is to be remembered, and the software has
 * a different one, which is to disappear while somebody works. Sharing a visual
 * language between the two would compromise whichever it was chosen for.
 *
 * Every claim here is one the product actually keeps. There is no roadmap
 * language and no feature that does not exist — the file sits next to the code
 * that implements it, so an invented claim would be visible to anyone reading
 * both.
 */

/**
 * Five flat colours, and no sixth.
 *
 * Neobrutalism relies on saturated fills separated by heavy black rules; add a
 * pastel or a tint and the whole thing softens into something else. Each panel
 * takes one of these at full strength, and the palette repeats rather than
 * extends.
 */
const COLOURS = {
  yellow: "bg-[#ffd93d]",
  pink: "bg-[#ff8fab]",
  green: "bg-[#7bdc9b]",
  blue: "bg-[#2f66e8] text-white",
  red: "bg-[#ff6b5a]",
} as const;

const MODULES = [
  {
    icon: Users,
    tint: COLOURS.yellow,
    title: "Customer intelligence",
    body: "RFM segmentation into ten segments, five value tiers, predicted lifetime value discounted by churn risk, and cohort retention month by month.",
  },
  {
    icon: BarChart3,
    tint: COLOURS.green,
    title: "Revenue you can act on",
    body: "Every KPI against the equal-length previous period, acquisition channels that bring first-time buyers, and time to second order with quartiles.",
  },
  {
    icon: Boxes,
    tint: COLOURS.pink,
    title: "Products and stock",
    body: "ABC classification, market-basket affinity, days of cover from real velocity, reorder points, and the revenue at risk behind each shortage.",
  },
  {
    icon: MessageCircle,
    tint: COLOURS.blue,
    title: "WhatsApp campaigns",
    body: "Ten templates personalised from each customer's own history, coupons created in WooCommerce, a dry run that sends nothing, and a typed confirmation.",
  },
  {
    icon: CalendarClock,
    tint: COLOURS.red,
    title: "Flows that run themselves",
    body: "Multi-step sequences days apart. Customers join as they qualify, nobody enters twice, and they leave the moment they buy.",
  },
  {
    icon: Bot,
    tint: COLOURS.pink,
    title: "An assistant that proposes",
    body: "Ask about the business in plain English. It reads your figures and drafts messages — then waits for you to approve before anything is sent.",
  },
];

const STACK = [
  ["01", "Your WooCommerce store", "Read over the REST API. One write: coupons."],
  ["02", "PulseCommerce", "One cached snapshot. Every metric derived from it."],
  ["03", "Your own WhatsApp API", "Your server, your number, no per-message fee."],
  ["04", "The model", "Sees counts and names. Never a phone number."],
] as const;

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#fdfbf5] text-black">
      {/* ---- Announcement -------------------------------------------------- */}
      <div className="border-b-[3px] border-black bg-[#2f66e8]">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-6 py-2.5 text-center text-sm font-extrabold text-white">
          <span className="rounded-full border-2 border-black bg-[#ffd93d] px-2.5 py-0.5 text-black">
            New
          </span>
          Automated flows and the AI assistant are live
          <Link href="#demo" className="underline decoration-2 underline-offset-4">
            See what&rsquo;s new
          </Link>
        </div>
      </div>

      {/* ---- Nav ---------------------------------------------------------- */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl border-[3px] border-black bg-[#2f66e8] shadow-[4px_4px_0_0_#000]">
            <Sparkles className="size-5 text-white" />
          </span>
          <span className="text-xl font-extrabold tracking-tighter">PulseCommerce</span>
        </div>

        <nav className="hidden items-center gap-7 text-base font-extrabold lg:flex">
          {[
            ["Features", "#features"],
            ["How it works", "#how"],
            ["Pricing", "#pricing"],
            ["FAQ", "#faq"],
          ].map(([label, href]) => (
            <Link key={label} href={href} className="hover:underline decoration-[3px] underline-offset-4">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <NeoButton href="#demo" tint="bg-white" className="hidden px-5 py-2 text-base sm:inline-flex">
            See a demo
          </NeoButton>
          <NeoButton href="/login" className="px-5 py-2 text-base">
            Get started
          </NeoButton>
        </div>
      </header>

      {/* ---- Hero --------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-20 md:pt-16">
        <NeoBadge>
          <span className="size-2 rounded-full bg-black" />
          For WooCommerce stores
        </NeoBadge>

        <h1 className="mt-6 max-w-4xl text-5xl leading-[1.02] font-extrabold tracking-tighter md:text-7xl">
          WooCommerce tells you <NeoMark tint="bg-white">what</NeoMark> sold.
          <br />
          We tell you <NeoMark tint={COLOURS.yellow}>who bought it.</NeoMark>
        </h1>

        <p className="mt-7 max-w-2xl text-xl leading-relaxed font-medium md:text-2xl">
          Which customers are slipping away, what they buy together, and what is about to run
          out — then message them on WhatsApp from the same screen, through a gateway you own.
        </p>

        <div className="mt-9 flex flex-wrap gap-4">
          <NeoButton href="/login">
            Get started free
            <ArrowRight className="size-5" />
          </NeoButton>
          <NeoButton href="#demo" tint="bg-white">
            <PlayCircle className="size-5" />
            See a demo
          </NeoButton>
        </div>

        <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-base font-bold">
          {["Self-hosted", "No per-message fee", "Read-only access", "Your data stays yours"].map((t) => (
            <span key={t} className="flex items-center gap-2">
              <Check className="size-5" strokeWidth={3} />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ---- The product itself ------------------------------------------- */}
      <section id="demo" className="mx-auto max-w-6xl px-6 pb-16">
        <NeoShot
          src="/shots/dashboard.png"
          alt="The PulseCommerce dashboard"
          caption="pulsecommerce.app/dashboard"
        />
      </section>

      {/* ---- What is in it -------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["13", "Modules, all included", COLOURS.yellow],
            ["10", "Report types, as PDF, Excel or CSV", COLOURS.pink],
            ["10", "Message templates, personalised per customer", COLOURS.green],
            ["0", "Customer records sent to a third party", COLOURS.blue],
          ].map(([n, label, tint], i) => (
            <NeoCard key={label} tint={tint} className="flex flex-col gap-1">
              <span className="text-5xl font-extrabold tracking-tighter">{n}</span>
              <span className={`text-base font-bold ${i === 3 ? "text-white/85" : "text-black/75"}`}>
                {label}
              </span>
            </NeoCard>
          ))}
        </div>
      </section>

      {/* ---- Integrations -------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <NeoHeading>Connects to the store you already run</NeoHeading>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <NeoCard tint={COLOURS.green} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-extrabold tracking-tight">WooCommerce</h3>
              <NeoBadge tint="bg-white">Available now</NeoBadge>
            </div>
            <p className="text-base leading-relaxed font-medium">
              Authorised through WooCommerce&rsquo;s own app-authorization screen inside your
              WordPress admin. You approve <b>read-only</b> access; no password is shared and no
              key is emailed. Coupons are the single thing written back, and only when you
              create one.
            </p>
            <ul className="mt-1 space-y-2 text-base font-bold">
              {["Orders, products, customers, coupons", "One pull, then every metric is instant", "Disconnecting wipes every cached order"].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-0.5 size-5 shrink-0" strokeWidth={3} />
                  {t}
                </li>
              ))}
            </ul>
          </NeoCard>

          <NeoCard tint="bg-white" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-extrabold tracking-tight">Shopify</h3>
              <NeoBadge tint={COLOURS.yellow}>Coming soon</NeoBadge>
            </div>
            <p className="text-base leading-relaxed font-medium text-black/75">
              The analytics engine reads a normalised snapshot rather than WooCommerce
              directly, so a second platform is an adapter rather than a rewrite. Shopify is
              next; every module above works unchanged once orders arrive in the same shape.
            </p>
            <p className="mt-1 text-base font-bold">
              Want it sooner? Tell us and we will prioritise it.
            </p>
          </NeoCard>
        </div>
      </section>

      {/* ---- Modules ------------------------------------------------------ */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <NeoHeading>Thirteen modules. One price.</NeoHeading>
        <p className="mt-4 max-w-2xl text-lg font-medium">
          Nothing here is a placeholder. Every figure is computed from your own orders — there
          is no sample data anywhere in the product.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ icon: Icon, tint, title, body }) => (
            <NeoCard key={title} className="flex flex-col gap-3">
              <span
                className={`flex size-12 items-center justify-center rounded-xl border-[3px] border-black ${tint}`}
              >
                <Icon className={`size-6 ${tint === COLOURS.blue ? "text-white" : ""}`} strokeWidth={2.5} />
              </span>
              <h3 className="text-2xl font-extrabold tracking-tight">{title}</h3>
              <p className="text-base leading-relaxed font-medium text-black/75">{body}</p>
            </NeoCard>
          ))}
        </div>
      </section>

      {/* ---- More of the product ------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <NeoHeading>Every screen, working on your own data</NeoHeading>
        <p className="mt-4 max-w-2xl text-lg font-medium">
          These are captures of the running application, not mockups.
        </p>
        <div className="mt-9 grid gap-6 md:grid-cols-2">
          <NeoShot src="/shots/customers.png" alt="Customer segmentation" caption="Customers — RFM segments and tiers" />
          <NeoShot src="/shots/campaigns.png" alt="Campaign builder" caption="Campaigns — build an audience, then send" />
          <NeoShot src="/shots/assistant.png" alt="The assistant" caption="Assistant — ask, then approve" />
          <NeoShot src="/shots/inventory.png" alt="Inventory planning" caption="Inventory — days of cover and reorder points" />
        </div>
      </section>

      {/* ---- How it works -------------------------------------------------- */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-16">
        <NeoHeading>Running in an afternoon</NeoHeading>
        <div className="mt-9 grid gap-5 md:grid-cols-4">
          {[
            ["1", "Connect", "Enter your store address and approve read-only access in your own admin."],
            ["2", "Pull once", "The order history is fetched and cached. Every figure comes from that snapshot."],
            ["3", "Find who matters", "Filter to the customers slipping away, or the ones worth thanking."],
            ["4", "Message them", "Write once, personalised per customer, and send from the same screen."],
          ].map(([n, title, body], i) => (
            <NeoCard
              key={n}
              tint={[COLOURS.yellow, COLOURS.pink, COLOURS.green, COLOURS.blue][i]}
              className="flex flex-col gap-2"
            >
              <span className="flex size-11 items-center justify-center rounded-lg border-[3px] border-black bg-white text-xl font-extrabold text-black">
                {n}
              </span>
              <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>
              <p className={`text-base font-medium ${i === 3 ? "text-white/85" : "text-black/75"}`}>{body}</p>
            </NeoCard>
          ))}
        </div>
      </section>

      {/* ---- Architecture ------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <NeoPanel tint={COLOURS.green}>
          <NeoHeading>Four parts, one product</NeoHeading>
          <p className="mt-4 max-w-2xl text-lg font-medium">
            Three of them run on infrastructure you control. The fourth never sees a customer.
          </p>

          <div className="mt-9 grid gap-5 md:grid-cols-2">
            {STACK.map(([n, title, body], i) => (
              <NeoCard key={n} tint={i === 1 ? COLOURS.blue : "bg-white"} className="flex gap-4">
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-lg border-[3px] border-black text-base font-extrabold ${
                    i === 1 ? "bg-white text-black" : COLOURS.yellow
                  }`}
                >
                  {n}
                </span>
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>
                  <p className={`mt-1 text-base font-medium ${i === 1 ? "text-white/85" : "text-black/75"}`}>
                    {body}
                  </p>
                </div>
              </NeoCard>
            ))}
          </div>
        </NeoPanel>
      </section>

      {/* ---- Safety ------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <NeoPanel tint={COLOURS.blue}>
            <span className="flex size-12 items-center justify-center rounded-xl border-[3px] border-black bg-white">
              <ShieldCheck className="size-6" strokeWidth={2.5} />
            </span>
            <NeoHeading className="mt-5 text-white">
              The assistant proposes. You approve.
            </NeoHeading>
            <p className="mt-4 text-lg leading-relaxed font-medium text-white/90">
              It reads anything and changes nothing. Sending a message, starting a flow or
              switching on the auto-reply all arrive as a card you approve — and approving runs
              the same guarded route a person would have used.
            </p>
            <ul className="mt-6 space-y-3 text-lg font-bold text-white">
              {[
                "No tool for messaging your whole customer base",
                "Phone numbers and emails are absent from everything it reads",
                "A product link it did not find in your catalogue is stripped",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-1 size-5 shrink-0" strokeWidth={3} />
                  {t}
                </li>
              ))}
            </ul>
          </NeoPanel>

          <div className="flex flex-col gap-6">
            <NeoCard tint={COLOURS.red}>
              <h3 className="text-2xl font-extrabold tracking-tight">Your own WhatsApp API</h3>
              <p className="mt-2 text-base leading-relaxed font-medium">
                A messaging server on your infrastructure. Nobody sits between you and your
                customers, there is no per-message fee, and no subscription to renew.
              </p>
            </NeoCard>
            <NeoCard tint={COLOURS.yellow}>
              <h3 className="text-2xl font-extrabold tracking-tight">Answers at 3am</h3>
              <p className="mt-2 text-base leading-relaxed font-medium">
                A customer who messages out of hours gets a numbered menu straight away. Only
                the trigger word starts it, so a real question still reaches a person.
              </p>
            </NeoCard>
          </div>
        </div>
      </section>

      {/* ---- Two ways to send ---------------------------------------------- */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
        <NeoHeading>Two ways to send. Same platform.</NeoHeading>
        <p className="mt-4 max-w-3xl text-lg font-medium">
          The analytics, the flows, the assistant and the inbox are identical either way. The
          only difference is what carries the messages — and that choice is a genuine
          trade-off, not an upsell.
        </p>

        <div className="mt-9 grid gap-6 lg:grid-cols-2">
          <NeoCard tint="bg-white" className="flex flex-col gap-4">
            <NeoBadge tint={COLOURS.green}>Guaranteed delivery</NeoBadge>
            <h3 className="text-3xl font-extrabold tracking-tighter">
              PulseCommerce + official WhatsApp Cloud API
            </h3>
            <p className="text-base leading-relaxed font-medium text-black/75">
              Meta&rsquo;s own API. Messages are delivered under their terms, tappable buttons
              and product cards work, and your number cannot be restricted for using it as
              intended.
            </p>
            <ul className="space-y-2.5 text-base font-bold">
              {[
                "Delivery backed by Meta",
                "Buttons and product cards available",
                "Template approval required before sending",
                "Meta charges per conversation, ongoing",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <Check className="mt-0.5 size-5 shrink-0" strokeWidth={3} />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-1 border-t-[3px] border-black pt-4 text-base font-bold">
              Best when delivery matters more than cost, or you send to people who have not
              bought from you before.
            </p>
          </NeoCard>

          <NeoCard tint={COLOURS.blue} className="flex flex-col gap-4">
            <NeoBadge tint="bg-white">No per-message fee</NeoBadge>
            <h3 className="text-3xl font-extrabold tracking-tighter">
              PulseCommerce + your own WhatsApp host
            </h3>
            <p className="text-base leading-relaxed font-medium text-white/85">
              A messaging server on infrastructure you control. Your number, your message
              history, nobody in the middle, and no charge per message however many you send.
            </p>
            <ul className="space-y-2.5 text-base font-bold text-white">
              {[
                "No per-message cost, ever",
                "Your number and your history stay yours",
                "No template approval, no waiting",
                "Delivery is not guaranteed; use a dedicated number",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <Check className="mt-0.5 size-5 shrink-0" strokeWidth={3} />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-1 border-t-[3px] border-black pt-4 text-base font-bold text-white">
              Best for messaging your own past customers at volume, where a per-message fee
              would dominate the cost.
            </p>
          </NeoCard>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <NeoButton href="/login">
            Get started
            <ArrowRight className="size-5" />
          </NeoButton>
          <NeoButton href="#demo" tint={COLOURS.yellow}>
            Not sure which? See the demo
          </NeoButton>
        </div>
      </section>

      {/* ---- Close -------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <NeoPanel tint={COLOURS.yellow} className="text-center">
          <NeoHeading className="text-5xl md:text-6xl">
            Connect a store. See it in minutes.
          </NeoHeading>
          <p className="mx-auto mt-5 max-w-2xl text-xl font-medium">
            You approve read-only access inside your own WordPress admin. No password is shared,
            no key is emailed, and disconnecting wipes every cached order.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <NeoButton href="/login">
              Connect your store
              <ArrowRight className="size-5" />
            </NeoButton>
            <NeoButton href="/dashboard" tint="bg-white">
              See the dashboard
            </NeoButton>
          </div>
        </NeoPanel>
      </section>

      {/* ---- FAQ ------------------------------------------------------------ */}
      <section id="faq" className="mx-auto max-w-6xl px-6 py-16">
        <NeoHeading>Everything you need to know</NeoHeading>
        <div className="mt-9 grid gap-5 md:grid-cols-2">
          {[
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
          ].map(([q, a], i) => (
            <NeoCard key={q} tint={i % 2 ? "bg-white" : COLOURS.yellow} className="flex flex-col gap-2">
              <h3 className="text-xl font-extrabold tracking-tight">{q}</h3>
              <p className="text-base leading-relaxed font-medium text-black/75">{a}</p>
            </NeoCard>
          ))}
        </div>
      </section>

      {/* ---- Footer --------------------------------------------------------- */}
      <footer className="border-t-[3px] border-black bg-black text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl border-[3px] border-white bg-[#2f66e8]">
                <Sparkles className="size-5" />
              </span>
              <span className="text-xl font-extrabold tracking-tighter">PulseCommerce</span>
            </div>
            <p className="mt-4 max-w-xs text-base font-medium text-white/70">
              Analytics and WhatsApp for WooCommerce stores that would rather act on their
              numbers than read them.
            </p>
          </div>

          {[
            ["Product", [["Features", "#features"], ["How it works", "#how"], ["Pricing", "#pricing"], ["API reference", "/api-docs"]]],
            ["Platform", [["WooCommerce", "#"], ["Shopify — soon", "#"], ["Your own WhatsApp host", "#pricing"], ["WhatsApp Cloud API", "#pricing"]]],
            ["Start", [["Get started", "/login"], ["See a demo", "#demo"], ["Open the app", "/dashboard"], ["FAQ", "#faq"]]],
          ].map(([title, links]) => (
            <div key={title as string}>
              <h4 className="text-base font-extrabold tracking-tight">{title as string}</h4>
              <ul className="mt-4 space-y-2.5 text-base font-medium text-white/70">
                {(links as string[][]).map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="hover:text-white hover:underline decoration-2 underline-offset-4">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t-[3px] border-white/20">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm font-bold text-white/70">
            <span>© 2026 PulseCommerce. Self-hosted, and yours.</span>
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#7bdc9b]" />
              Your data never leaves your deployment
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
