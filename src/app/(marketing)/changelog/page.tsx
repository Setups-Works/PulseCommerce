import type { Metadata } from "next";
import { Plus, Sparkles, Wrench } from "lucide-react";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { Section } from "@/components/marketing/sections";
import { Cta } from "@/components/marketing/landing/cta";
import { CHANGELOG, type ChangeKind } from "@/lib/marketing/changelog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "What shipped, and when. Every entry here is a real, shipped change — nothing written for this page that isn't in the product.",
  alternates: { canonical: "/changelog" },
};

const KIND_LABEL: Record<ChangeKind, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

const KIND_ICON: Record<ChangeKind, typeof Plus> = {
  new: Plus,
  improved: Sparkles,
  fixed: Wrench,
};

function formatReleaseDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The changelog.
 *
 * Sourced from src/lib/marketing/changelog.ts, one commit history removed —
 * see that file's own header for what's deliberately left out and why. No
 * hero illustration here on purpose: the entries are the point, and a mock
 * screenshot of "what shipped" would just be a worse changelog than the text
 * already is.
 */
export default function ChangelogPage() {
  return (
    <main>
      <section className="relative isolate overflow-hidden">
        <AnimatedGridPattern
          id="changelog-hero-grid"
          numSquares={22}
          maxOpacity={0.05}
          duration={4.5}
          className={cn(
            "inset-x-0 inset-y-[-35%] h-[170%] skew-y-12",
            "[mask-image:radial-gradient(520px_circle_at_center,white,transparent)]",
          )}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-36 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl dark:bg-primary/14" />
        </div>

        <div className="mx-auto max-w-3xl px-4 pt-14 pb-10 text-center sm:px-6 md:pt-20">
          <BlurFade inView>
            <Badge variant="outline" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" />
              Changelog
            </Badge>
          </BlurFade>
          <BlurFade delay={0.08} inView>
            <h1 className="mx-auto mt-6 max-w-2xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
              What shipped, and when.
            </h1>
          </BlurFade>
          <BlurFade delay={0.16} inView>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
              Every entry below is a real, shipped change — nothing written for this page that
              isn&apos;t in the product.
            </p>
          </BlurFade>
        </div>
      </section>

      <Section className="pt-0">
        <div className="mx-auto max-w-3xl">
          <ol className="space-y-14">
            {CHANGELOG.map((release, releaseIndex) => (
              <BlurFade key={release.date} delay={Math.min(releaseIndex * 0.04, 0.24)} inView>
                <li className="relative border-l pl-6 sm:pl-8">
                  <span
                    aria-hidden
                    className="absolute top-1.5 left-0 size-2.5 -translate-x-1/2 rounded-full border-2 border-background bg-primary"
                  />
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <time dateTime={release.date} className="text-sm font-medium text-muted-foreground">
                      {formatReleaseDate(release.date)}
                    </time>
                    {release.title ? (
                      <h2 className="text-lg font-semibold tracking-tight">{release.title}</h2>
                    ) : null}
                  </div>

                  <ul className="mt-4 space-y-3.5">
                    {release.changes.map((change, i) => {
                      const Icon = KIND_ICON[change.kind];
                      return (
                        <li key={i} className="flex gap-3">
                          <span
                            className={cn(
                              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                              change.kind === "new" && "bg-primary/10 text-primary",
                              change.kind === "improved" && "bg-muted text-muted-foreground",
                              change.kind === "fixed" && "bg-muted text-muted-foreground",
                            )}
                            aria-hidden
                          >
                            <Icon className="size-3" strokeWidth={2.5} />
                          </span>
                          <p className="text-sm leading-relaxed">
                            <span className="mr-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                              {KIND_LABEL[change.kind]}
                            </span>
                            {change.text}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              </BlurFade>
            ))}
          </ol>
        </div>
      </Section>

      <Cta
        id="changelog-cta"
        title="See it against your own store's numbers."
        body="Connect your store, and every entry above becomes something you can actually go check."
      />
    </main>
  );
}
