import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, Lock, ShieldCheck } from "lucide-react";
import { AuthOutcome } from "@/components/auth-outcome";
import { Button, Card } from "@heroui/react";
import { Field } from "@/components/ui-hero/field";
import { BrandMark, BRANDS } from "@/components/marketing/brand-mark";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { authConfigured } from "@/lib/auth/session";
import { readStoreConfig } from "@/lib/store/config";
import { storageIsDurable } from "@/lib/store/kv";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect your store",
  robots: { index: false, follow: false },
};

/**
 * Onboarding, step one: connect a WooCommerce store.
 *
 * Posts to the same `/api/auth/woo/start` endpoint `/connect` has always used
 * — the authorization round trip is unchanged, and this page is a nicer frame
 * around it rather than a second implementation of it. `/connect` stays where
 * it is because failed authorizations redirect back to it by URL and because
 * self-hosted deployments without accounts still need a way in.
 *
 * Already connected? Straight on to the WhatsApp step. Coming back here after
 * connecting should not mean doing it again.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [config, params] = await Promise.all([readStoreConfig(), searchParams]);

  if (config && !params.auth) redirect("/onboarding/whatsapp");

  const outcome = resolveOutcome(typeof params.auth === "string" ? params.auth : null);

  return (
    <OnboardingShell
      step="store"
      title="Connect your WooCommerce store"
      subtitle="PulseCommerce analyses your real orders and ships with no sample data, so there is nothing to show until a store is authorized."
      aside={<WhatHappensNext />}
    >
      {outcome ? (
        <div className="mb-6">
          <AuthOutcome outcome={outcome} />
        </div>
      ) : null}

      <Card className="p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface-secondary">
            <BrandMark icon={BRANDS.woocommerce} className="size-5" brandColor />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Authorize with WooCommerce</h2>
            <p className="text-xs text-muted">Read-only, approved in your own admin</p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          You approve read-only access inside your own WordPress admin. WooCommerce issues the key
          and delivers it here directly, so you never handle a secret and this app never asks for
          one.
        </p>

        <form action="/api/auth/woo/start" method="get" className="mt-5 flex flex-col gap-3">
          <Field
            label="Store URL"
            name="url"
            type="url"
            placeholder="https://yourstore.com"
            autoComplete="url"
            autoFocus
            isRequired
            inputProps={{ minLength: 4 }}
          />
          <Button type="submit" variant="primary" fullWidth>
            Continue to WooCommerce
            <ArrowRight className="size-4" />
          </Button>
        </form>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Assurance
          icon={Lock}
          title="Read-only"
          body="Only GET requests, to orders, customers and products. There is no path by which this app could change your store."
        />
        <Assurance
          icon={ShieldCheck}
          title="Stays on your machine"
          body="The issued key is held in your own storage, never in a browser bundle. Disconnecting deletes it and every cached order."
        />
      </div>

      <p className="mt-6 text-xs text-muted">
        Already connected on another machine?{" "}
        <Link href="/dashboard" className="text-foreground underline-offset-4 hover:underline">
          Open the dashboard
        </Link>
      </p>
    </OnboardingShell>
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

function Assurance({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Lock;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border p-3.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-accent" />
      <div className="min-w-0">
        <p className="text-xs font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}

/** The three things that happen after the button, so the wait has a shape. */
function WhatHappensNext() {
  const steps: [string, string][] = [
    ["You approve", "WooCommerce shows you exactly what is being requested."],
    ["We pull once", "Your order history is fetched and cached. A few minutes on a large store."],
    ["Everything is instant", "Every figure, including changing the date range, comes from that snapshot."],
  ];

  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/60 p-5">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">
        What happens next
      </p>
      <ol className="mt-4 flex flex-col gap-4">
        {steps.map(([title, detail], i) => (
          <li key={title} className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-[10px] font-semibold tabular-nums">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex items-start gap-2 border-t border-border pt-4">
        <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
        <p className="text-xs text-muted">
          Nothing is written to your store except a coupon, and only when you create one.
        </p>
      </div>
    </div>
  );
}
