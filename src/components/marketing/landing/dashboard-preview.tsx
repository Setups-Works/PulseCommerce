"use client";

import * as React from "react";
import { BorderBeam } from "@/components/ui/border-beam";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Section, SectionHeading } from "@/components/marketing/sections";
import { ProductScreen, type ScreenView } from "@/components/marketing/landing/product-screen";

/**
 * The product, at four screens.
 *
 * A tabbed preview rather than four stacked screenshots: the point being made
 * is that these are one product rather than four features, and a tab strip
 * says that in a way a vertical stack does not.
 *
 * All four panels are rendered up front and hidden by the tab, not mounted on
 * demand. They are static markup with no data fetching, so mounting them
 * together costs nothing measurable — and it means switching tabs is instant
 * rather than a flash of empty frame at the exact moment someone is judging
 * whether the product feels fast.
 *
 * The frame is `aria-hidden`: it is a drawing of an interface, and a screen
 * reader reading out its fake KPI figures would present them as real. The tabs
 * themselves stay operable, so the section is still explorable by keyboard.
 */

const TABS: { value: ScreenView; label: string; blurb: string }[] = [
  { value: "overview", label: "Revenue", blurb: "Every KPI against the equal-length prior period." },
  { value: "customers", label: "Customers", blurb: "Ten segments, predicted value and churn risk." },
  { value: "retention", label: "Retention", blurb: "Every acquisition month followed forward." },
  { value: "forecast", label: "Forecast", blurb: "Projected revenue with a confidence band." },
];

export function DashboardPreview() {
  const [view, setView] = React.useState<ScreenView>("overview");
  const active = TABS.find((tab) => tab.value === view) ?? TABS[0];

  return (
    <Section id="product">
      <SectionHeading
        align="center"
        eyebrow="The product"
        title="Every screen, on your own data"
        body="Nothing here is sample data. Connect a store and these are your customers, your products and your months."
      />

      <Tabs
        value={view}
        onValueChange={(next) => setView(next as ScreenView)}
        className="mt-10 items-center"
      >
        <TabsList className="h-auto flex-wrap justify-center">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <p className="mt-3 text-center text-sm text-muted-foreground">{active.blurb}</p>

        <div className="relative mt-6 w-full overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 shadow-[0_20px_70px_-30px_rgb(0_0_0/0.4)]">
          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="m-0">
              {/* A fixed ratio on the frame rather than a height on the screen:
                  the screen is a grid that fills its parent, so the parent has
                  to be the thing with a shape, or the layout collapses. */}
              <div aria-hidden className="aspect-16/10 w-full sm:aspect-2/1">
                <ProductScreen view={tab.value} />
              </div>
            </TabsContent>
          ))}

          <BorderBeam
            size={200}
            duration={14}
            colorFrom="var(--primary)"
            colorTo="color-mix(in oklch, var(--chart-3) 70%, transparent)"
          />
        </div>
      </Tabs>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Figures shown are generic placeholders. These pages are public, so no real store&rsquo;s data
        appears on them.
      </p>
    </Section>
  );
}
