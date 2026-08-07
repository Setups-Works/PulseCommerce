import { ArrowRight, Lock, ShieldCheck, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthOutcome } from "@/components/auth-outcome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authConfigured } from "@/lib/auth/session";
import { readStoreConfig } from "@/lib/store/config";
import { storageIsDurable } from "@/lib/store/kv";

export const dynamic = "force-dynamic";

/**
 * Onboarding: the step between signing up and having a dashboard.
 *
 * The marketing site owns `/`, so this route exists purely to turn a visitor
 * into a connected store. Once one is connected it has no reason to exist and
 * hands straight over to the dashboard.
 */
export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const config = await readStoreConfig();
  const params = await searchParams;

  // Already connected, and not being sent here by a failed authorization.
  if (config && !params.auth) redirect("/dashboard");

  const outcome = resolveOutcome(typeof params.auth === "string" ? params.auth : null);

  return (
    <div className="flex min-h-full flex-col">
      <main className="flex flex-1 items-center justify-center px-4 py-14">
        <div className="w-full max-w-xl space-y-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <Image
              src="/logo.svg"
              alt="PulseCommerce"
              width={56}
              height={56}
              className="rounded-xl dark:hidden"
              priority
            />
            <Image
              src="/logo-dark.svg"
              alt="PulseCommerce"
              width={56}
              height={56}
              className="hidden rounded-xl dark:block"
              priority
            />
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Connect your WooCommerce store</h1>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-pretty text-muted-foreground">
                PulseCommerce analyses your real orders and ships with no sample data, so there is nothing to show
                until a store is authorized.
              </p>
            </div>
          </div>

          <OnboardingSteps />

          {outcome ? <AuthOutcome outcome={outcome} /> : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Store className="size-4 text-muted-foreground" />
                Authorize with WooCommerce
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                You approve read-only access inside your own WordPress admin. WooCommerce issues the key and
                delivers it here directly, so you never handle a secret and this app never asks for one.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <form action="/api/auth/woo/start" method="get" className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="url">Store URL</Label>
                  <Input
                    id="url"
                    name="url"
                    type="text"
                    placeholder="https://yourstore.com"
                    autoComplete="url"
                    autoFocus
                    required
                    minLength={4}
                  />
                </div>
                <Button type="submit" className="w-full gap-1.5">
                  Continue to WooCommerce
                  <ArrowRight className="size-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Point
              icon={Lock}
              title="Read-only"
              body="Only GET requests, to orders, customers and products. There is no path by which this app could change your store."
            />
            <Point
              icon={ShieldCheck}
              title="Stays on your machine"
              body="The issued key is held in your own storage, never in a browser bundle. Disconnecting deletes it and every cached order."
            />
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Already connected on another machine?{" "}
            <Link href="/dashboard" className="text-foreground hover:underline">
              Open the dashboard
            </Link>
            {" · "}
            <Link href="/" className="text-foreground hover:underline">
              Back to the site
            </Link>
          </p>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-muted-foreground">
          <p>PulseCommerce, advanced analytics for WooCommerce.</p>
          <div className="flex items-center gap-3">
            <span className="leading-tight">Built by</span>
            {/* The mark ships in both polarities; CSS picks one per theme. */}
            <a href="https://setups.works" target="_blank" rel="noreferrer" aria-label="Setups Works">
              <Image
                src="/brand/setups-works-black.png"
                alt="Setups Works"
                width={132}
                height={44}
                className="h-8 w-auto dark:hidden"
              />
              <Image
                src="/brand/setups-works-white.png"
                alt="Setups Works"
                width={132}
                height={44}
                className="hidden h-8 w-auto dark:block"
              />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Environment problems get reported through the URL, which means the message
 * outlives the problem: fix the environment, and the stale link still shows the
 * old complaint. Re-check the ones that are conditions rather than events, so a
 * solved problem stops being reported.
 */
function resolveOutcome(outcome: string | null): string | null {
  if (!outcome) return null;
  if (outcome === "no_storage" && storageIsDurable()) return null;
  if (outcome === "missing_auth_secret" && authConfigured()) return null;
  return outcome;
}

/**
 * Where the merchant is in getting to a dashboard.
 *
 * Only the first step happens on this page; the other two are what the wait
 * afterwards is for. Showing all three stops the authorization round trip from
 * looking like the whole of setup.
 */
function OnboardingSteps() {
  const steps = [
    { n: 1, label: "Authorize", detail: "Approve read-only access" },
    { n: 2, label: "First pull", detail: "Order history is cached" },
    { n: 3, label: "Dashboard", detail: "Every metric, instant" },
  ];

  return (
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {steps.map((step, i) => (
        <li
          key={step.n}
          className={`flex items-center gap-2.5 rounded-lg border p-3 ${i === 0 ? "bg-muted/50" : ""}`}
        >
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
              i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {step.n}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold">{step.label}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{step.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Point({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Lock;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-1 rounded-lg border p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="size-3.5 text-muted-foreground" />
        {title}
      </p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
