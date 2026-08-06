import Link from "next/link";
import { ArrowRight, Code2, Webhook } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/sections";
import {
  PlatformList,
  PlatformOrbit,
} from "@/components/marketing/landing/platform-orbit";

/**
 * Integrations, on the landing page.
 *
 * The orbit and the platform list both come from landing/platform-orbit.tsx,
 * shared with /integrations — the two pages make the same claim with the same
 * logos, and a second copy of the ring would be a second thing to keep in step.
 *
 * The two generic doors below are named here rather than left implicit: they
 * are what covers everything the rings do not, and a developer evaluating this
 * wants to know they exist before they count the logos.
 */

const DOORS: [typeof Webhook, string, string][] = [
  [Webhook, "Webhooks", "Push events out as they happen"],
  [Code2, "REST API", "Everything the interface reads, documented in OpenAPI"],
];

export function Integrations() {
  return (
    <Section id="integrations">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <BlurFade inView>
          <Badge variant="secondary">Integrations</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Nothing to migrate. One store to connect.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            PulseCommerce reads what you already have. Your catalogue stays where it is, your
            checkout stays where it is, and your customers never see a change.
          </p>

          <PlatformList className="mt-7" />

          <div className="mt-7 space-y-2.5">
            {DOORS.map(([Icon, title, note]) => (
              <div key={title} className="flex items-start gap-2.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm">
                  <span className="font-medium">{title}</span>
                  <span className="text-muted-foreground"> — {note}</span>
                </p>
              </div>
            ))}
          </div>

          <Button variant="outline" size="lg" asChild className="mt-7 h-10 px-5 text-sm">
            <Link href="/integrations">
              Every integration, and what it can touch
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </BlurFade>

        <BlurFade delay={0.15} inView>
          <PlatformOrbit />
        </BlurFade>
      </div>
    </Section>
  );
}
