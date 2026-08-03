"use client";

import Link from "next/link";
import { ChevronDown, Sparkles } from "lucide-react";
import { NeoButton } from "@/components/neo";

/**
 * The marketing header, with a mega menu.
 *
 * Opened on hover with CSS rather than state, so it works before hydration and
 * needs no JavaScript to be useful. The panel is inside the trigger's hover
 * area — a gap between the two is the classic bug where the menu closes as the
 * pointer travels toward it.
 *
 * On small screens the menu is not a menu at all: the same links render as a
 * plain scrollable row. A hover panel has no meaning on a touch screen.
 */

const MENU: { title: string; blurb: string; items: [string, string, string][] }[] = [
  {
    title: "Analyse",
    blurb: "Understand who is buying, and who has stopped.",
    items: [
      ["Customer intelligence", "/features#customers", "RFM, lifetime value, churn risk"],
      ["Revenue & acquisition", "/features#revenue", "Every KPI against the prior period"],
      ["Products & stock", "/features#products", "ABC classes, days of cover"],
    ],
  },
  {
    title: "Act",
    blurb: "Reach them without leaving the screen.",
    items: [
      ["WhatsApp campaigns", "/features#campaigns", "Ten templates, personalised"],
      ["Automated flows", "/features#flows", "Sequences that run themselves"],
      ["The assistant", "/features#assistant", "Proposes; you approve"],
    ],
  },
  {
    title: "Connect",
    blurb: "The store you already run.",
    items: [
      ["WooCommerce", "/integrations", "Available now, read-only"],
      ["Shopify", "/integrations#shopify", "Coming soon"],
      ["Your own WhatsApp host", "/pricing", "No per-message fee"],
      ["WhatsApp Cloud API", "/pricing", "Delivery backed by Meta"],
    ],
  },
];

export function NeoNav() {
  return (
    <header className="border-b-[3px] border-black bg-[#fdfbf5]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/landing" className="flex shrink-0 items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl border-[3px] border-black bg-[#2f66e8] shadow-[4px_4px_0_0_#000]">
            <Sparkles className="size-5 text-white" />
          </span>
          <span className="text-xl font-extrabold tracking-tighter">PulseCommerce</span>
        </Link>

        {/* Desktop: the mega menu. */}
        <nav className="hidden items-center gap-1 lg:flex">
          <div className="group relative">
            <button className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-base font-extrabold hover:bg-[#ffd93d] hover:border-[3px] hover:border-black">
              Product
              <ChevronDown className="size-4" strokeWidth={3} />
            </button>

            <div className="invisible absolute left-1/2 z-50 w-[54rem] -translate-x-1/2 pt-3 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
              <div className="grid grid-cols-3 gap-6 rounded-2xl border-[3px] border-black bg-white p-6 shadow-[10px_10px_0_0_#000]">
                {MENU.map((col) => (
                  <div key={col.title}>
                    <h3 className="text-lg font-extrabold tracking-tight">{col.title}</h3>
                    <p className="mt-1 text-sm font-medium text-black/60">{col.blurb}</p>
                    <ul className="mt-4 space-y-1">
                      {col.items.map(([label, href, desc]) => (
                        <li key={label}>
                          <Link
                            href={href}
                            className="block rounded-lg border-[3px] border-transparent px-3 py-2 transition-colors hover:border-black hover:bg-[#ffd93d]"
                          >
                            <span className="block text-base font-extrabold">{label}</span>
                            <span className="block text-sm font-medium text-black/60">{desc}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {[
            ["Features", "/features"],
            ["Integrations", "/integrations"],
            ["Pricing", "/pricing"],
          ].map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="rounded-lg px-4 py-2 text-base font-extrabold hover:bg-[#ffd93d]"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <NeoButton href="/login" tint="bg-white" className="hidden px-5 py-2 text-base sm:inline-flex">
            Log in
          </NeoButton>
          <NeoButton href="/login" className="px-5 py-2 text-base">
            Get started
          </NeoButton>
        </div>
      </div>

      {/* Small screens: a scrollable row, not a hover menu. */}
      <div className="flex gap-2 overflow-x-auto border-t-[3px] border-black px-6 py-2.5 lg:hidden">
        {[
          ["Features", "/features"],
          ["Integrations", "/integrations"],
          ["Pricing", "/pricing"],
          ["FAQ", "/pricing#faq"],
        ].map(([label, href]) => (
          <Link
            key={label}
            href={href}
            className="shrink-0 rounded-lg border-[3px] border-black bg-white px-3 py-1.5 text-sm font-extrabold shadow-[3px_3px_0_0_#000]"
          >
            {label}
          </Link>
        ))}
      </div>
    </header>
  );
}
