# Changelog

All notable changes to PulseCommerce are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — landing page

A full rebuild of `/` as a thirteen-section marketing page, composed in
`src/app/(marketing)/page.tsx` from one file per section under
`src/components/marketing/landing/`.

| # | Section | File | Client? |
|---|---------|------|---------|
| 1 | Hero, with browser-framed product shot | `hero.tsx` | server |
| 2 | Stack logo band | `trusted-by.tsx` | server |
| 3 | Why PulseCommerce (bento) | `why-bento.tsx` | server |
| 4 | Thirteen analytics modules | `modules.tsx` | server |
| 5 | AI commerce agent + pipeline | `ai-agent.tsx` | **client** |
| 6 | Tabbed dashboard preview | `dashboard-preview.tsx` | **client** |
| 7 | Enterprise feature grid | `features.tsx` | server |
| 8 | Automation workflow | `automation.tsx` | **client** |
| 9 | Integrations orbit | `integrations.tsx` | server |
| 10 | Pricing | `pricing.tsx` | server |
| 11 | Testimonials | `testimonials.tsx` | server |
| 12 | FAQ | `faq.tsx` | server |
| 13 | Closing CTA | `cta.tsx` | server |

Only three sections cross the client boundary. The other ten stay
server-rendered because each section is its own module — a single `"use client"`
at the top of the page would have dragged all thirteen across.

### Added — Magic UI components

Vendored from the [Magic UI](https://magicui.design) registry with
`npx shadcn@latest add "https://magicui.design/r/<name>.json"`. They live in
`src/components/ui/` alongside the shadcn components, per this project's
`components.json` aliases.

| Component | File | Used by |
|-----------|------|---------|
| Animated Beam | `animated-beam.tsx` | AI agent, Automation |
| Animated Grid Pattern | `animated-grid-pattern.tsx` | Hero, CTA |
| Animated List | `animated-list.tsx` | Why bento (flow card) |
| Animated Shiny Text | `animated-shiny-text.tsx` | Hero announcement pill |
| Aurora Text | `aurora-text.tsx` | Hero headline |
| Bento Grid | `bento-grid.tsx` | Why bento |
| Blur Fade | `blur-fade.tsx` | Every section's scroll reveal |
| Border Beam | `border-beam.tsx` | Hero frame, dashboard frame, recommended tier |
| Magic Card | `magic-card.tsx` | Module cards |
| Marquee | `marquee.tsx` | Logo band, message card, testimonials |
| Meteors | `meteors.tsx` | CTA panel |
| Number Ticker | `number-ticker.tsx` | Hero proof strip, module metrics |
| Orbiting Circles | `orbiting-circles.tsx` | Integrations |
| Ripple | `ripple.tsx` | AI agent backdrop |
| Safari | `safari.tsx` | Hero, feature rows, AI grounding |
| iPhone | `iphone.tsx` | Hero, WhatsApp, campaigns, features |
| Scroll Progress | `scroll-progress.tsx` | Landing page top rule |
| Typing Animation | `typing-animation.tsx` | AI agent conversation |

Three registry components were modified after install, all because they ship
with a palette or a media model of their own:

- **`bento-grid.tsx`** — hardcoded `text-neutral-700` / `text-neutral-400` and
  a white inset shadow replaced with `bg-card`, `ring-1 ring-foreground/10` and
  `text-muted-foreground`; the CTA `<a>` became a `next/link`; the hover-only
  CTA also reveals on `:focus-within` so it is keyboard-reachable.
- **`safari.tsx`** and **`iphone.tsx`** — both gained a `children` slot that
  renders live DOM into the device's screen area, as an alternative to
  `imageSrc`/`src`/`videoSrc`. This project draws its screenshots from its own
  components rather than capturing them, so the screen has to be real elements.

Ten further components were pulled in, found to be unused, and removed rather
than left in the tree: `animated-gradient-text`, `dot-pattern`, `globe`,
`grid-pattern`, `interactive-hover-button`, `particles`, `shimmer-button`,
`shine-border`, `text-animate`, `word-rotate`. Removing `globe` also removed
its `cobe` dependency.

### Added — supporting pieces

- `src/components/ui/accordion.tsx` — shadcn accordion, for the FAQ.
- `src/components/marketing/brand-mark.tsx` — third-party logos from
  `simple-icons`, monochrome by default and coloured only on hover.
- `src/components/marketing/landing/product-screen.tsx` — the application drawn
  rather than screenshotted, in four views. Its sidebar is generated from
  `NAV_GROUPS`, the same constant the real application navigates by, so a
  renamed module is renamed on the landing page too. Charts are hand-drawn SVG
  rather than Recharts, to keep the page's client bundle down.
- `src/lib/marketing/plans.ts`, `faq.ts`, `schema.ts` — pricing, questions and
  JSON-LD, shared between `/` and `/pricing`.

### Added — SEO

- `metadataBase`, Open Graph, Twitter card, robots and `themeColor` on the root
  layout; canonical URLs on `/` and `/pricing`.
- `src/app/opengraph-image.tsx` — the social card generated with `ImageResponse`
  rather than checked in as a PNG. `twitter-image.tsx` re-exports it.
- `src/app/sitemap.ts` and `src/app/robots.ts`. Authenticated application routes
  are disallowed.
- JSON-LD `@graph` on `/` covering `Organization`, `WebSite`,
  `SoftwareApplication` (with per-tier `Offer`s), `FAQPage` and
  `BreadcrumbList` — generated from the same constants the page renders, so the
  structured data cannot disagree with the visible content.

### Changed — the rest of the marketing site

The same treatment was applied across `/features`, `/features/ai`,
`/features/campaigns`, `/whatsapp`, `/integrations` and `/pricing`, so the site
reads as one product rather than one redesigned page and five older ones.

- **Shared page hero** — `landing/page-hero.tsx`, used by all five sub-pages.
  Takes a required `id` because the animated grid's SVG pattern id shares one
  document-wide namespace, and a collision silently gives the second pattern
  the first one's geometry.
- **Shared closing CTA** — `landing/cta.tsx` now takes `id`, `title` and
  `body`, replacing six near-identical hand-written closing cards.
- **Shared platform orbit** — `landing/platform-orbit.tsx`, used by the landing
  page and `/integrations`. Ships a `PlatformList` alongside it, which every
  caller renders: the orbit itself is `aria-hidden`, and a ring of moving icons
  is unreadable to a screen reader and invisible to a crawler.
- **Device mockups everywhere they say something.** A browser frame for
  merchant-facing screens, a phone for customer-facing ones. The landing hero
  now shows both, overlapped — the product is genuinely two surfaces, and
  showing only the dashboard described half of it. New
  `landing/phone-screen.tsx` draws the WhatsApp conversation that goes inside.
- **Real brand marks, not glyphs.** Generic lucide icons standing in for
  WooCommerce, WhatsApp and Meta were replaced with their actual logos via
  `BrandMark`. Someone scanning an integrations row is looking for the specific
  mark of the thing they already run.
- **Header and mega menu rebuilt.** The panel is now a four-column grid with
  three equal fractions and a fixed featured pane; column labels occupy their
  own row so the first link in every column starts at the same y; every row
  uses one 28px icon box and one two-line text block, so labels share a
  baseline grid across columns. The header is transparent over the hero and
  turns to glass on scroll. A fourth link was added to each column.
- `/pricing` renders the landing page's own pricing cards via
  `<Pricing heading={false} />` rather than a second copy of the markup, and
  its FAQ moved from a card grid to the same accordion the landing page uses.

### Changed — data

- `src/app/(marketing)/pricing/page.tsx` now imports `PLANS`, `INCLUDED` and
  `FAQ` from `src/lib/marketing/` instead of holding its own copies. A price
  can no longer be current on one page and stale on the other.
- `src/components/marketing/site-footer.tsx` gained a newsletter field, social
  links and a Platform column entry for webhooks. The newsletter form has no
  `action` on purpose — see the note in the file.
- `eslint.config.mjs` — `react-hooks/set-state-in-effect` is switched off for
  four named Magic UI files, where the pattern is deliberate. Scoped to those
  exact paths rather than to `components/ui/**`, so the rule keeps its teeth
  over the project's own components.

### Dependencies

- Added `motion` (required by the Magic UI components),
  `@radix-ui/react-icons` (pulled in by the registry) and `simple-icons`.
- No image or animation library beyond those; `cobe` was added by the globe
  component and removed with it.

### Known placeholders

Two things on the page are structure rather than content, and say so both on
the page and in their source files:

- **Prices** in `src/lib/marketing/plans.ts` — amounts are not a commercial
  decision yet.
- **Testimonials** in `landing/testimonials.tsx` — no quote came from a
  customer. They are attributed by role and store type, never to an invented
  person or company, and the section heading states that they are illustrative.
  Replace with real, attributed, permitted quotes before launch.

Also unset: the social links in the footer point at bare domains, and
`NEXT_PUBLIC_SITE_URL` should be set in production so preview deployments do
not claim to be canonical.
