import {
  Clock,
  Database,
  Download,
  Fingerprint,
  Gauge,
  KeyRound,
  Keyboard,
  Layers,
  Moon,
  RefreshCw,
  Table2,
  Wifi,
} from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { Section, SectionHeading } from "@/components/marketing/sections";

/**
 * The enterprise grid.
 *
 * The unglamorous half of the product, and the half that decides whether
 * someone evaluating it seriously will actually adopt it: how fast it is after
 * the first load, what it does to their data, whether it exports, whether it
 * can be driven from a keyboard.
 *
 * Deliberately dense and low-decoration. This is the section a buyer scans
 * rather than reads, and a card carrying an illustration would slow that scan
 * down for no gain — the bento grid above already did the persuading.
 */

const FEATURES: [typeof Gauge, string, string][] = [
  [
    Database,
    "One snapshot, every metric",
    "Your order history is pulled once and cached. Every figure is derived from that snapshot, so changing the date range is instant rather than another round trip.",
  ],
  [
    KeyRound,
    "Authorised in your own admin",
    "WooCommerce's app-authorization screen, read-only. No password is shared and no key is emailed.",
  ],
  [
    Fingerprint,
    "Phone numbers never reach the browser",
    "They are resolved server-side at the moment a message is sent, and are absent from everything the assistant can read.",
  ],
  [
    Download,
    "Exports that survive a board meeting",
    "Ten report types as PDF, Excel or CSV, with the same figures and the same formatting as the screen.",
  ],
  [
    Table2,
    "Every customer, not a capped slice",
    "Sortable, filterable and exportable in full. No top-100 ceiling hiding the long tail where churn actually happens.",
  ],
  [
    RefreshCw,
    "Disconnect wipes everything",
    "Removing a store deletes its credentials and every cached order with it, in the same action.",
  ],
  [
    Keyboard,
    "Command palette and shortcuts",
    "Every screen reachable from the keyboard, with a palette on the same chord you already use everywhere else.",
  ],
  [
    Moon,
    "Light and dark, properly",
    "Two tuned palettes rather than an inverted one — including the eight-slot chart palette, restepped for each surface.",
  ],
  [
    Layers,
    "Colour that means something",
    "A validated categorical palette that clears colour-vision separation, assigned in fixed order so a series keeps its colour when a filter changes.",
  ],
  [
    Clock,
    "Flows that run on a schedule",
    "Steps land days apart, customers join as they qualify, nobody enters twice, and the rest is dropped once they buy.",
  ],
  [
    Wifi,
    "Your own WhatsApp host, or Meta's",
    "The analytics, flows, assistant and inbox are identical either way. Only the carrier changes.",
  ],
  [
    Gauge,
    "A REST API and OpenAPI schema",
    "Everything the interface reads is available over the same documented API, with a browsable reference.",
  ],
];

export function Features() {
  return (
    <Section id="features" className="bg-muted/20">
      <SectionHeading
        eyebrow="Built for people who will actually check"
        title="The details that decide it"
        body="The parts nobody puts in a hero, and everybody asks about in the second meeting."
      />

      <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(([Icon, title, body], i) => (
          <BlurFade key={title} delay={Math.min(i * 0.04, 0.32)} inView>
            <div className="group flex gap-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card transition-colors group-hover:border-primary/40">
                <Icon
                  className="size-4.5 text-muted-foreground transition-colors group-hover:text-primary"
                  strokeWidth={1.75}
                />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </div>
          </BlurFade>
        ))}
      </div>
    </Section>
  );
}
