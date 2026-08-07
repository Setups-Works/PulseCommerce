import * as React from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt, faCheck } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

/**
 * The onboarding frame: brand bar, step rail, panel.
 *
 * A server component. The steps are static and the progress comes from the
 * route, so none of this needs to run in the browser — which is why it uses
 * HeroUI's tokens directly rather than any of its interactive components.
 *
 * The rail shows every step from the start, including the ones not reached
 * yet. Revealing them one at a time makes a three-step setup feel open-ended;
 * showing all three up front is the difference between "nearly done" and "how
 * much more of this is there".
 */

export const ONBOARDING_STEPS = [
  { slug: "store", label: "Connect your store", href: "/onboarding" },
  { slug: "whatsapp", label: "Choose how messages send", href: "/onboarding/whatsapp" },
  { slug: "done", label: "See your data", href: "/onboarding/done" },
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]["slug"];

export function OnboardingShell({
  step,
  title,
  subtitle,
  children,
  aside,
}: {
  step: OnboardingStep;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.slug === step);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <FontAwesomeIcon icon={faBolt} className="w-3.5" />
            </span>
            <span className="text-base font-semibold tracking-tight">PulseCommerce</span>
          </Link>

          <Link
            href="/dashboard"
            className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            Skip for now
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 md:py-14">
        {/* ---- Step rail ------------------------------------------------- */}
        <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {ONBOARDING_STEPS.map((s, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <li key={s.slug} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    active ? "font-medium text-foreground" : "text-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                      done && "bg-accent text-accent-foreground",
                      active && "bg-accent text-accent-foreground",
                      !done && !active && "border border-border text-muted",
                    )}
                  >
                    {done ? <FontAwesomeIcon icon={faCheck} className="w-2.5" /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </span>
                {i < ONBOARDING_STEPS.length - 1 ? (
                  <span aria-hidden className="hidden h-px w-8 bg-border sm:block" />
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="mt-10">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h1>
          {subtitle ? (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-pretty text-muted">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className={cn("mt-8", aside && "grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12")}>
          <div className="min-w-0">{children}</div>
          {aside ? <div className="min-w-0">{aside}</div> : null}
        </div>
      </div>
    </div>
  );
}
