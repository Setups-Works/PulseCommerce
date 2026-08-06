import { BrandMark, BRANDS } from "@/components/marketing/brand-mark";
import { Marquee } from "@/components/ui/marquee";

/**
 * The logo band.
 *
 * Deliberately *not* a "trusted by" wall of customer logos. Putting a company
 * name here that has not agreed to it — or has never used the product — is the
 * one lie on a landing page that is both easy to spot and expensive to be
 * caught in, and this codebase already refuses to invent figures elsewhere.
 *
 * What it shows instead is verifiable and more useful to the person reading
 * it: the systems PulseCommerce actually connects to. A WooCommerce merchant
 * scanning this row is looking for their own stack, and finding it answers a
 * real question that a row of strangers' logos does not.
 *
 * Marks are monochrome until hovered — see the note in brand-mark.tsx.
 */

const STACK = [
  { icon: BRANDS.woocommerce, label: "WooCommerce" },
  { icon: BRANDS.wordpress, label: "WordPress" },
  { icon: BRANDS.whatsapp, label: "WhatsApp" },
  { icon: BRANDS.meta, label: "Meta" },
  { icon: BRANDS.stripe, label: "Stripe" },
  { icon: BRANDS.razorpay, label: "Razorpay" },
  { icon: BRANDS.googleAnalytics, label: "Google Analytics" },
  { icon: BRANDS.googleSheets, label: "Google Sheets" },
];

export function TrustedBy() {
  return (
    // The band's tint is resolved to one opaque colour and held in `--band`,
    // because the edge fades have to end in exactly the colour behind them.
    // A translucent `bg-muted/20` cannot be matched by a gradient stop — the
    // fade would end on the page background and leave two visible seams.
    <section className="border-y bg-(--band) py-10 [--band:color-mix(in_oklch,var(--muted)_28%,var(--background))]">
      <p className="text-center text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Reads from, and writes to, the stack you already run
      </p>

      {/* The fade at both edges is what stops the track reading as a strip
          that got clipped by the viewport. */}
      <div className="relative mt-6">
        <Marquee pauseOnHover className="[--duration:38s] [--gap:3.5rem]">
          {STACK.map(({ icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <BrandMark icon={icon} className="size-6 shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">{label}</span>
            </div>
          ))}
        </Marquee>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-linear-to-r from-(--band) to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-linear-to-l from-(--band) to-transparent" />
      </div>
    </section>
  );
}
