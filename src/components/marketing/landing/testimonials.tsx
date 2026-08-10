import { Quote } from "lucide-react";
import { Marquee } from "@/components/ui/marquee";
import { Section, SectionHeading } from "@/components/marketing/sections";
import { cn } from "@/lib/utils";

/**
 * Testimonials.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PLACEHOLDER COPY. None of the quotes below came from a customer. They are
 * structure — the shape and length of quote this section is built for — and
 * must be replaced with real, attributed, permitted quotes before this page
 * is public. Same convention as the figures in lib/marketing/plans.ts.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Two deliberate constraints while they are placeholders:
 *
 *   - Attribution is by role and store type, never an invented person or
 *     company. A fabricated name attached to a fabricated quote is the kind of
 *     thing that is trivially caught and expensive to be caught in, and the
 *     rest of this site goes out of its way not to invent figures.
 *   - Avatars are monograms rather than stock portraits. Putting a real
 *     photographed person's face against words they never said is worse than
 *     having no avatar at all.
 *
 * When the real quotes land, keep them specific — a number and a behaviour
 * change beats an adjective. "We found 200 customers we'd written off" is
 * worth ten of "great product, highly recommend".
 */

interface Testimonial {
  quote: string;
  role: string;
  context: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "We knew revenue was flat. We did not know that a third of last year's buyers had quietly stopped, or that they all bought the same two consumables.",
    role: "Founder",
    context: "Home & living store",
  },
  {
    quote:
      "The dry run is the feature. Being able to resolve the real list and send nothing meant we actually trusted it enough to press send.",
    role: "Head of growth",
    context: "Supplements brand",
  },
  {
    quote:
      "Our win-back used to be a spreadsheet and an afternoon. It is now a filter, and the sequence stops itself the moment somebody orders.",
    role: "Marketing lead",
    context: "Speciality foods",
  },
  {
    quote:
      "Days of cover computed from real velocity, rather than a flat low-stock threshold, changed which products we reorder first.",
    role: "Operations manager",
    context: "Multi-brand retailer",
  },
  {
    quote:
      "The assistant drafting the message and then waiting is the right way round. I have never once wanted an AI to message my customers unsupervised.",
    role: "Founder",
    context: "Skincare store",
  },
  {
    quote:
      "Running the WhatsApp host ourselves meant no per-message fee at the volume we send, which is the entire reason the numbers work.",
    role: "Technical lead",
    context: "Direct-to-consumer brand",
  },
];

/**
 * A monogram derived from the role, so the avatar is at least consistent
 * between renders rather than a random shape.
 */
function initials(role: string) {
  return role
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function TestimonialCard({ quote, role, context }: Testimonial) {
  return (
    <figure
      className={cn(
        "w-80 shrink-0 rounded-xl bg-card p-5 ring-1 ring-foreground/10",
        "transition-shadow duration-300 hover:shadow-[0_8px_32px_-12px_rgb(0_0_0/0.22)]",
      )}
    >
      <Quote className="size-4 text-primary/50" />
      <blockquote className="mt-3 text-sm leading-relaxed text-pretty">{quote}</blockquote>
      <figcaption className="mt-4 flex items-center gap-2.5 border-t pt-4">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
        >
          {initials(role)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium">{role}</span>
          <span className="block truncate text-xs text-muted-foreground">{context}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export function Testimonials() {
  const half = Math.ceil(TESTIMONIALS.length / 2);

  return (
    <Section id="testimonials" className="overflow-hidden">
      <SectionHeading
        align="center"
        title="What merchants say"
        body="Quotes below are illustrative placeholders while the first cohort of stores is onboarding — they are not attributed to real customers."
      />

      {/* Two tracks in opposite directions. One long track scrolling one way
          reads as a ticker; two reads as a wall, which is the impression a
          testimonial section is after. */}
      <div className="relative mt-10 flex flex-col gap-4">
        <Marquee pauseOnHover className="[--duration:52s] [--gap:1rem]">
          {TESTIMONIALS.slice(0, half).map((item) => (
            <TestimonialCard key={item.quote} {...item} />
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover className="[--duration:58s] [--gap:1rem]">
          {TESTIMONIALS.slice(half).map((item) => (
            <TestimonialCard key={item.quote} {...item} />
          ))}
        </Marquee>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-linear-to-r from-background to-transparent sm:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-linear-to-l from-background to-transparent sm:w-32" />
      </div>
    </Section>
  );
}
