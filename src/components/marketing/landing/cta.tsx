import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { Meteors } from "@/components/ui/meteors";
import { cn } from "@/lib/utils";

/**
 * The closing call to action.
 *
 * The only full-bleed dark panel on the page, in both themes. It is the last
 * thing a visitor sees and it needs to read as a different kind of moment
 * from the twelve sections of explanation above it — inverting the surface
 * does that more cheaply, and more quietly, than a fifth accent colour would.
 *
 * Because the panel is dark in light mode too, the copy inside it cannot use
 * `text-foreground` / `text-muted-foreground`: those flip with the theme and
 * would go black-on-black. Everything here is stated against the panel rather
 * than against the page.
 */

const REASSURANCES = ["Fourteen days free", "No card to start", "Disconnect wipes everything"];

export interface CtaProps {
  /** Unique per page: the grid's SVG pattern id shares a document-wide namespace. */
  id?: string;
  title?: string;
  body?: string;
}

export function Cta({
  id = "cta",
  title = "Connect a store. See who is slipping away.",
  body = "You approve read-only access inside your own WordPress admin. No password is shared, no key is emailed, and disconnecting wipes every cached order.",
}: CtaProps = {}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <BlurFade inView>
        <div className="relative isolate overflow-hidden rounded-3xl bg-neutral-950 px-6 py-16 text-center sm:px-12 md:py-20">
          <AnimatedGridPattern
            numSquares={26}
            maxOpacity={0.08}
            duration={4}
            id={`${id}-grid`}
            className={cn(
              "inset-x-0 inset-y-[-40%] h-[180%] skew-y-8 stroke-white/10",
              "[mask-image:radial-gradient(520px_circle_at_center,white,transparent)]",
            )}
          />
          <Meteors number={12} className="bg-white/60" />

          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl"
          />

          <div className="relative">
            <h2 className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl md:text-5xl">
              {title}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base text-pretty text-white/65 sm:text-lg">
              {body}
            </p>

            <div className="mt-9 flex flex-col justify-center gap-2.5 sm:flex-row sm:gap-3">
              <Button size="lg" asChild className="h-11 bg-white px-6 text-sm text-neutral-950 hover:bg-white/90">
                <Link href="/signup">
                  Connect your store
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                asChild
                className="h-11 border border-white/20 bg-white/5 px-6 text-sm text-white hover:bg-white/10"
              >
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-white/55">
              {REASSURANCES.map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="size-3.5 shrink-0 text-white/70" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}
