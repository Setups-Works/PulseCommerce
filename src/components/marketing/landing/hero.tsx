import Link from "next/link";
import { ArrowRight, Check, ChevronDown, PlayCircle, TrendingUp, Users } from "lucide-react";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { AuroraText } from "@/components/ui/aurora-text";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { Iphone } from "@/components/ui/iphone";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Safari } from "@/components/ui/safari";
import { PhoneScreen } from "@/components/marketing/landing/phone-screen";
import { ProductScreen } from "@/components/marketing/landing/product-screen";
import { cn } from "@/lib/utils";

/**
 * The hero.
 *
 * The one section that has to do a job rather than look like it is doing one:
 * say what this is, show the product, and offer the two things a visitor came
 * to do. Everything decorative sits behind `aria-hidden` and none of it is
 * load-bearing — the section reads identically with every animation switched
 * off, which is what a visitor with reduced motion actually gets.
 *
 * The screen inside the browser frame is live DOM, not an image. It stays
 * sharp at every width, its text is selectable and translatable, and it cannot
 * drift out of date the way a checked-in PNG does.
 */

/** Figures a visitor can verify by reading the rest of the site. */
const PROOF: [number, string, string][] = [
  [13, "", "Analytics modules"],
  [10, "", "Report types"],
  [0, "", "Records sent to third parties"],
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* ---- Backdrop ---------------------------------------------------- */}
      <AnimatedGridPattern
        numSquares={40}
        maxOpacity={0.06}
        duration={4}
        className={cn(
          "inset-x-0 inset-y-[-30%] h-[160%] skew-y-12",
          "[mask-image:radial-gradient(680px_circle_at_center,white,transparent)]",
        )}
      />

      {/* Two blurred washes rather than a full aurora field: the hero already
          carries a grid, a browser frame and two floating cards, and a third
          moving background layer turns the headline into something you read
          past rather than read. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl dark:bg-primary/15" />
        <div className="absolute top-20 -right-40 size-[30rem] rounded-full bg-chart-7/10 blur-3xl dark:bg-chart-7/12" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-14 pb-12 sm:px-6 md:pt-20">
        {/* ---- Announcement ---------------------------------------------- */}
        <BlurFade delay={0.05} inView className="flex justify-center">
          <Link
            href="/features/ai"
            className="group inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs backdrop-blur transition-colors hover:bg-muted"
          >
            <span className="flex size-1.5 shrink-0 rounded-full bg-primary" />
            <AnimatedShinyText className="mx-0">
              Flows and the AI assistant are live
            </AnimatedShinyText>
            <ArrowRight className="size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </BlurFade>

        {/* ---- Headline --------------------------------------------------- */}
        <BlurFade delay={0.12} inView>
          <h1 className="mx-auto mt-6 max-w-4xl text-center text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
            Know who buys.{" "}
            <AuroraText
              colors={["var(--chart-7)", "var(--primary)", "var(--chart-3)", "var(--primary)"]}
              speed={0.6}
            >
              Win them back
            </AuroraText>{" "}
            on WhatsApp.
          </h1>
        </BlurFade>

        <BlurFade delay={0.2} inView>
          <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg md:text-xl">
            WooCommerce tells you what sold. PulseCommerce tells you who bought it, which of them is
            slipping away, and what to say to bring them back — from one screen.
          </p>
        </BlurFade>

        {/* ---- Calls to action --------------------------------------------- */}
        <BlurFade delay={0.28} inView>
          <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row sm:gap-3">
            <Button size="lg" asChild className="h-11 px-6 text-sm">
              <Link href="/signup">
                Connect your store
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="h-11 px-6 text-sm">
              <Link href="/whatsapp">
                <PlayCircle className="size-4" />
                See WhatsApp in action
              </Link>
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground sm:text-sm">
            {["Read-only access", "No per-message fee", "Self-hosted", "Your data stays yours"].map(
              (item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="size-3.5 shrink-0 text-primary" />
                  {item}
                </span>
              ),
            )}
          </div>
        </BlurFade>

        {/* ---- The product, both halves of it -------------------------------- */}
        {/*
         * A browser and a phone, overlapped, because the product genuinely is
         * two surfaces: the merchant works in a dashboard, the customer
         * receives a WhatsApp message, and showing only the dashboard would
         * describe half the thing.
         *
         * The phone overlaps the browser's lower-right corner on `lg` and
         * above. Below that it drops to its own row and shrinks — an
         * overlapping composition at phone width is two things covering each
         * other rather than one picture.
         *
         * The whole assembly is `aria-hidden`: it is a drawing of an interface,
         * and a screen reader announcing a fake sidebar and fake KPI figures
         * would present them as the real application.
         */}
        <BlurFade delay={0.38} inView className="relative mt-14">
          <div aria-hidden className="relative lg:pr-24">
            <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10 shadow-[0_24px_80px_-24px_rgb(0_0_0/0.35)]">
              <Safari url="app.pulsecommerce.io/dashboard" className="w-full">
                <ProductScreen view="overview" />
              </Safari>
              <BorderBeam
                size={220}
                duration={12}
                colorFrom="var(--primary)"
                colorTo="color-mix(in oklch, var(--chart-7) 70%, transparent)"
                borderWidth={1.5}
              />
            </div>

            {/* The phone. Absolute on wide screens, in flow below that. */}
            <div
              className={cn(
                "mx-auto mt-8 w-44 sm:w-52",
                "lg:absolute lg:right-0 lg:-bottom-10 lg:mt-0 lg:w-56",
                "drop-shadow-[0_20px_45px_rgb(0_0_0/0.35)]",
              )}
            >
              <Iphone>
                <PhoneScreen conversation="campaign" />
              </Iphone>
            </div>

            {/* ---- Floating proof cards ---------------------------------- */}
            {/* Hidden below `lg`: at phone width they would sit over the screen
                they are annotating and hide the thing they point at. */}
            <div className="absolute -top-6 -left-6 hidden lg:block">
              <FloatCard
                icon={<TrendingUp className="size-3.5 text-good" />}
                label="Predicted LTV"
                value="₹4.2L"
                note="at risk this month"
              />
            </div>
            <div className="absolute bottom-16 -left-6 hidden lg:block">
              <FloatCard
                icon={<Users className="size-3.5 text-primary" />}
                label="Slipping away"
                value="214"
                note="past their own reorder gap"
              />
            </div>
          </div>
        </BlurFade>

        {/* Names the two surfaces above, since the assembly itself is hidden
            from assistive technology. */}
        <p className="mt-16 text-center text-xs text-muted-foreground lg:mt-24">
          The dashboard you work in, and the message your customer receives.
        </p>

        {/* ---- Proof strip --------------------------------------------------- */}
        <BlurFade delay={0.5} inView>
          <div className="mt-14 grid grid-cols-1 gap-6 border-t pt-8 sm:grid-cols-3">
            {PROOF.map(([value, suffix, label]) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                  <NumberTicker value={value} className="text-foreground" />
                  {suffix}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </BlurFade>

        {/* ---- Scroll hint ---------------------------------------------------- */}
        <div aria-hidden className="mt-12 flex justify-center">
          <ChevronDown className="size-5 animate-bounce text-muted-foreground/60" />
        </div>
      </div>
    </section>
  );
}

/** A small annotated figure, floating over the product shot. */
function FloatCard({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="w-52 rounded-xl bg-card/80 p-3 ring-1 ring-foreground/10 backdrop-blur-md shadow-[0_8px_32px_-8px_rgb(0_0_0/0.25)]">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}
