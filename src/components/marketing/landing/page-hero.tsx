import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { AuroraText } from "@/components/ui/aurora-text";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The hero every marketing page below the landing page uses.
 *
 * Built once rather than per page for the obvious reason — five copies of the
 * same grid, wash and heading rhythm would drift apart within a week — and for
 * a less obvious one: the `id` on AnimatedGridPattern has to be unique per
 * instance, because SVG pattern ids share one document-wide namespace and a
 * collision silently gives the second pattern the first one's geometry. Taking
 * it as a required prop makes that impossible to forget.
 *
 * `accent` marks the words that carry the gradient. Kept to two or three — an
 * entire headline in gradient is a headline nobody can read at a glance.
 */

export interface PageHeroProps {
  /** Unique per page. Feeds the SVG pattern id; see note above. */
  id: string;
  eyebrow: string;
  /** Text before the gradient words. */
  title: string;
  /** The gradient words. Omit for a plain headline. */
  accent?: string;
  /** Text after the gradient words. */
  titleAfter?: string;
  body: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
  /** A device mock, diagram or card sitting beside the copy on wide screens. */
  aside?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHero({
  id,
  eyebrow,
  title,
  accent,
  titleAfter,
  body,
  primary = { label: "Connect your store", href: "/signup" },
  secondary,
  aside,
  children,
}: PageHeroProps) {
  return (
    <section className="relative isolate overflow-hidden border-b">
      <AnimatedGridPattern
        id={`${id}-hero-grid`}
        numSquares={28}
        maxOpacity={0.05}
        duration={4.5}
        className={cn(
          "inset-x-0 inset-y-[-35%] h-[170%] skew-y-12",
          "[mask-image:radial-gradient(560px_circle_at_30%_40%,white,transparent)]",
        )}
      />

      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 size-[34rem] rounded-full bg-primary/10 blur-3xl dark:bg-primary/14" />
        <div className="absolute -top-16 right-0 size-[26rem] rounded-full bg-chart-7/8 blur-3xl dark:bg-chart-7/12" />
      </div>

      <div
        className={cn(
          "mx-auto max-w-6xl px-4 pt-14 pb-14 sm:px-6 md:pt-20",
          aside && "grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]",
        )}
      >
        <div>
          <BlurFade inView>
            <Badge variant="outline" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" />
              {eyebrow}
            </Badge>
          </BlurFade>

          <BlurFade delay={0.08} inView>
            <h1 className="mt-6 max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
              {title}
              {accent ? (
                <>
                  {" "}
                  <AuroraText
                    colors={["var(--chart-7)", "var(--primary)", "var(--chart-3)", "var(--primary)"]}
                    speed={0.6}
                  >
                    {accent}
                  </AuroraText>
                </>
              ) : null}
              {titleAfter ? <> {titleAfter}</> : null}
            </h1>
          </BlurFade>

          <BlurFade delay={0.16} inView>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
              {body}
            </p>
          </BlurFade>

          <BlurFade delay={0.24} inView>
            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:gap-3">
              <Button size="lg" asChild className="h-11 px-6 text-sm">
                <Link href={primary.href}>
                  {primary.label}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {secondary ? (
                <Button variant="outline" size="lg" asChild className="h-11 px-6 text-sm">
                  <Link href={secondary.href}>{secondary.label}</Link>
                </Button>
              ) : null}
            </div>
            {children}
          </BlurFade>
        </div>

        {aside ? (
          <BlurFade delay={0.3} inView className="min-w-0">
            {aside}
          </BlurFade>
        ) : null}
      </div>
    </section>
  );
}
