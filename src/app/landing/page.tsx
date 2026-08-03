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
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { NeoBadge, NeoButton, NeoCard, NeoHeading, NeoMark, NeoPanel } from "@/components/neo";

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
      {/* ---- Nav ---------------------------------------------------------- */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl border-[3px] border-black bg-[#2f66e8] shadow-[4px_4px_0_0_#000]">
            <Sparkles className="size-5 text-white" />
          </span>
          <span className="text-xl font-extrabold tracking-tighter">PulseCommerce</span>
        </div>
        <NeoButton href="/login" tint="bg-white" className="px-5 py-2 text-base">
          Open the app
        </NeoButton>
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
            Connect your store
            <ArrowRight className="size-5" />
          </NeoButton>
          <NeoButton href="/api-docs" tint="bg-white">
            Read the API
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

      {/* ---- Modules ------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-6 py-16">
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

      <footer className="border-t-[3px] border-black">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-base font-bold">
          <span>PulseCommerce — analytics and WhatsApp for WooCommerce</span>
          <Link href="/api-docs" className="underline decoration-[3px] underline-offset-4">
            API reference
          </Link>
        </div>
      </footer>
    </main>
  );
}
