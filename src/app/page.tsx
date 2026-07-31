import {
  Activity,
  ArrowRight,
  Building2,
  ChartColumnBig,
  ChartLine,
  Download,
  Layers,
  Lock,
  Package,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: ChartLine,
    title: "Revenue intelligence",
    body: "Net revenue, AOV, units, refunds and discounts — every metric compared against the equal-length window before it, bucketed daily, weekly or monthly.",
  },
  {
    icon: Users,
    title: "RFM segmentation & CLV",
    body: "Every customer scored on recency, frequency and monetary value, sorted into the ten standard segments, with a predicted lifetime value and a churn-risk score.",
  },
  {
    icon: Layers,
    title: "High and low value cohorts",
    body: "Revenue deciles, Gini concentration and Pareto curves show how much of the business rests on how few customers — and who is quietly slipping away.",
  },
  {
    icon: Building2,
    title: "Business accounts",
    body: "B2B revenue rolled up by company, from the billing field or inferred from shared email domains, with buyer counts, growth and account tiers.",
  },
  {
    icon: ChartColumnBig,
    title: "Cohort retention",
    body: "Monthly acquisition cohorts with a full retention triangle and a cumulative LTV curve, so you can see when a customer pays back their acquisition cost.",
  },
  {
    icon: Package,
    title: "Product & basket analysis",
    body: "ABC classification, stock cover in days, refund rates by SKU, and market-basket affinity that surfaces which products genuinely sell together.",
  },
  {
    icon: Activity,
    title: "Forecasting",
    body: "Trend plus day-of-week seasonality projects the next two weeks of revenue with a 95% confidence band, so you know if you are pacing ahead or behind.",
  },
  {
    icon: Download,
    title: "Advanced report exports",
    body: "Eleven report types as a formatted Excel workbook, a branded PDF with cover and findings, or raw CSV — always matching the range on screen.",
  },
] as const;

const METRICS = [
  { value: "11", label: "Report types" },
  { value: "10", label: "RFM segments" },
  { value: "60+", label: "Computed metrics" },
  { value: "3", label: "Export formats" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="size-4.5" strokeWidth={2.5} />
            </span>
            <span className="text-sm font-semibold tracking-tight">PulseCommerce</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/settings">Connect a store</Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/dashboard">
                Open dashboard <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden border-b">
        <div className="grid-surface mask-fade-b pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
          <Badge variant="secondary" className="mb-5 gap-1.5">
            <Sparkles className="size-3.5" />
            Built on the WooCommerce REST API
          </Badge>

          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
            The analytics layer WooCommerce should have shipped with
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
            Approve read-only access in your own WordPress admin and get customer segmentation, lifetime value,
            cohort retention, acquisition channels, campaign performance and board-ready report exports, all
            computed from your live store.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-1.5">
              <Link href="/settings">
                Authorize your store <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/dashboard">Open the dashboard</Link>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Read-only access · approved in your own WordPress admin · your data never leaves your machine
          </p>

          <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            {METRICS.map((m) => (
              <div key={m.label} className="space-y-0.5">
                <dt className="text-3xl font-semibold tracking-tight">{m.value}</dt>
                <dd className="text-xs text-muted-foreground">{m.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything the WooCommerce admin leaves on the table
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Woo tells you what sold. This tells you who your best customers are, which ones are about to leave, what
            they buy together, and what next month looks like.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="space-y-2 border-t pt-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <feature.icon className="size-4 shrink-0 text-muted-foreground" />
                {feature.title}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3">
          <TrustPoint
            icon={Lock}
            title="Read-only by design"
            body="Only GET requests, only to orders, customers and products. A Read-scoped key is all it needs, so there is no path by which this app could modify your store."
          />
          <TrustPoint
            icon={ShieldCheck}
            title="Self-hosted"
            body="Credentials sit in an owner-only file on your own machine, never in a browser bundle and never on someone else's server. Disconnecting wipes the cache."
          />
          <TrustPoint
            icon={Zap}
            title="Fast on real catalogues"
            body="Field-trimmed, concurrency-bounded pagination with memory and disk caching — tested against a live store carrying more than 20,000 orders."
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">See it with your own numbers</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          There is no sample data to wade through. Authorize your store and every page fills with your own orders.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="gap-1.5">
            <Link href="/settings">
              Authorize your store <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/reports">Browse report types</Link>
          </Button>
        </div>
      </section>

      <footer className="mt-auto border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-4 px-4 py-7 text-xs text-muted-foreground">
          <div className="space-y-1.5">
            <p>PulseCommerce, advanced analytics for WooCommerce.</p>
            <p className="flex items-center gap-1.5">
              <Server className="size-3.5" />
              Runs entirely on your own infrastructure
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-right leading-tight">
              Built by{" "}
              <a
                href="https://www.linkedin.com/in/nitheeshdr/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground hover:underline"
              >
                Nitheesh Rajendran
              </a>
              <br />
              <a href="https://setups.works" target="_blank" rel="noreferrer" className="hover:underline">
                setups.works
              </a>
            </span>
            {/* The mark ships in both polarities; CSS picks one per theme. */}
            <a href="https://setups.works" target="_blank" rel="noreferrer" aria-label="Setups Works">
              <Image
                src="/brand/setups-works-black.png"
                alt="Setups Works"
                width={132}
                height={44}
                className="h-9 w-auto dark:hidden"
              />
              <Image
                src="/brand/setups-works-white.png"
                alt="Setups Works"
                width={132}
                height={44}
                className="hidden h-9 w-auto dark:block"
              />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TrustPoint({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Lock;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
