import Link from "next/link";
import { BlurFade } from "@/components/ui/blur-fade";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Section, SectionHeading } from "@/components/marketing/sections";
import { LANDING_FAQ } from "@/lib/marketing/faq";

/**
 * The FAQ.
 *
 * Questions come from lib/marketing/faq.ts, which also feeds the FAQPage
 * structured data on the page. Search engines penalise structured data that
 * disagrees with what is visible, and reading both from one array is the only
 * way to guarantee they never do.
 *
 * `type="single"` with `collapsible`: these are independent answers rather
 * than a checklist, and letting all six sit open turns the section into a wall
 * of text that defeats the point of collapsing it.
 */
export function Faq() {
  return (
    <Section id="faq">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <BlurFade inView>
          <SectionHeading title="Everything you need to know" />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Still deciding?{" "}
            <Link href="/pricing#faq" className="font-medium text-foreground underline-offset-4 hover:underline">
              The full list lives on the pricing page
            </Link>
            , and the{" "}
            <Link href="/api-docs" className="font-medium text-foreground underline-offset-4 hover:underline">
              API reference
            </Link>{" "}
            is public.
          </p>
        </BlurFade>

        <BlurFade delay={0.1} inView>
          <Accordion type="single" collapsible className="w-full">
            {LANDING_FAQ.map(({ question, answer }) => (
              <AccordionItem key={question} value={question}>
                <AccordionTrigger className="text-left text-base font-medium">
                  {question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </BlurFade>
      </div>
    </Section>
  );
}
