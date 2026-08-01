<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/logo-dark.svg">
  <img src="public/logo.svg" alt="PulseCommerce" width="88" height="88">
</picture>

# PulseCommerce

**Advanced analytics for WooCommerce.**

Customer segmentation, lifetime value, cohort retention, acquisition channels,
campaign audiences, WhatsApp broadcasts, inventory planning and board-ready
report exports, computed from your live store with read-only access you approve
yourself.

<p>
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000?logo=next.js&logoColor=white">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-087ea4?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white">
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white">
  <img alt="shadcn/ui" src="https://img.shields.io/badge/shadcn%2Fui-latest-000">
</p>

</div>

---

## What this is

WooCommerce tells you what sold. PulseCommerce tells you **who your best
customers are, which ones are about to leave, where they came from, what they
buy together, which products are about to run out, and what next month looks
like**.

It is a self-hosted Next.js app. You authorize a store through WooCommerce's own
app-authorization endpoint, it pulls your orders over the REST API, caches a
snapshot, and derives every metric from that snapshot at request time.

> **There is no sample data anywhere in this codebase.** Every number you see
> came from your store. A figure can never be a placeholder you mistook for real.

---

## Table of contents

- [Feature list](#feature-list)
- [Feature tour](#feature-tour)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Quick start](#quick-start)
- [Connecting a store](#connecting-a-store)
- [WhatsApp campaigns](#whatsapp-campaigns)
- [Multiple stores](#multiple-stores)
- [Optional password protection](#optional-password-protection)
- [Environment variables](#environment-variables)
- [Reports and exports](#reports-and-exports)
- [How the metrics are defined](#how-the-metrics-are-defined)
- [Architecture](#architecture)
- [Performance](#performance)
- [Design system](#design-system)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Scripts](#scripts)

---

## Feature list

<details open>
<summary><b>Revenue &amp; performance</b></summary>

- Net revenue, gross revenue, orders, average order value, units sold
- Discounts given, shipping collected, tax collected, refunded amount
- Items per order, revenue per customer, cancellation rate
- Every KPI compared against the **equal-length previous window**
- Revenue and orders on one shared axis (no misleading dual-axis charts)
- Day / week / month bucketing, automatic or manual
- Sparkline trend on each headline stat
- Refund rate, cancellation rate and average fulfilment time
- Generated findings, ranked by urgency, with plain-English explanations

</details>

<details open>
<summary><b>Customer analytics</b></summary>

- **RFM scoring** — recency, frequency and monetary quintiles of your own base
- **Ten standard RFM segments** — Champions, Loyal, Potential Loyalist, New
  Customers, Promising, Need Attention, At Risk, Cannot Lose Them, Hibernating,
  Lost
- **Value tiers** — VIP, High, Mid, Low, One-time
- **Predicted lifetime value** per customer, discounted by churn risk
- **Churn risk score**, judged against each customer's own reorder cadence
- **Revenue deciles** with a Pareto curve and cumulative share
- **Gini concentration coefficient** plus top 1/5/10/20% and bottom 50% shares
- Recency-versus-frequency bubble chart, sized by spend
- **Top customer spotlight** with their orders inline, and the runners-up beside it
- Ready-made cohorts: **high value, low value, at risk, rising**
- **Advanced filter panel** — segment, tier, minimum spend, minimum orders, churn
  risk, recency window, country, product bought, contactability
- **Every customer listed**, not a capped slice, with rows that expand in place
  to show that customer's orders
- Average days between orders, one-time buyer share, repeat rate

</details>

<details open>
<summary><b>Customer profiles</b></summary>

- Any customer row anywhere in the app drills through to their profile
- Identity, location, payment method and how long they have been a customer
- **Acquisition channel and device** they arrived on
- RFM scores shown as filled pips as well as numbers, so never colour-only
- Revenue percentile, refunds taken and discounts used
- What they buy, ranked by revenue
- Order value over time
- **Full order history** with status, line items, units, total and net

</details>

<details open>
<summary><b>Acquisition &amp; retention</b></summary>

- **New vs returning revenue** by month, stacked
- **Full new-customer and returning-customer tables**, sortable and searchable,
  with first-order date, CLV, churn risk and first product bought
- **Acquisition channels** from WooCommerce Order Attribution — organic, direct,
  referral, paid/UTM, admin, mobile app
- Which channels actually bring **first-time** buyers, not just orders
- **Device breakdown** — mobile, desktop, tablet — by revenue and AOV
- Pages per session and revenue per customer, per channel
- **Median time to second order**, with quartiles and a distribution histogram
- **Cohort retention triangle** — monthly acquisition cohorts, retention or
  revenue view, unelapsed cells left blank rather than shown as zero
- **Cumulative LTV curve** per acquired customer
- Attribution coverage percentage, so partial history is never silently hidden

</details>

<details open>
<summary><b>Campaigns &amp; audiences</b></summary>

- **Audience builder** with live reach, revenue represented, predicted CLV and
  average churn risk
- **Goal presets** — VIP appreciation, win-back lapsed, convert to second order,
  rescue at-risk high value, loyal advocates, business accounts — each with a
  stated rationale
- Filter on segment, value tier, recency window, minimum spend, minimum orders,
  churn risk, country, account type, product bought, contactability
- Live audience preview table, exactly matching the export
- **CSV export** shaped for email and ads platforms, formula-injection guarded
- **Campaign performance** from `utm_campaign` — orders, revenue, customers,
  new-customer share, new-customer revenue, AOV, top device
- **Coupon performance** — uses, discount given, revenue, return on discount

</details>

<details open>
<summary><b>WhatsApp campaigns</b></summary>

- Send an audience a **text, image or video** message through a **self-hosted
  WhatsApp gateway** ([OpenWA](https://github.com/rmyndharis/OpenWA)) that you
  run and control
- `{{name}}` personalisation, degrading cleanly for guest checkouts with no
  usable name
- **Dry run** resolves the exact recipient list and sends nothing — how many are
  reachable, how many were dropped and why, a masked sample, and the message as
  the first real recipient would receive it
- **Test send** to a number you type by hand; it cannot reach a customer
- **Typed confirmation** of the deliverable count before anything goes out, and
  the server re-resolves the audience and refuses if it changed since
- **Opt-out list**, applied server-side after the audience is built, so no UI
  mistake can route around it
- **Paced sending** — the gateway spaces messages with jitter; a broadcast is a
  resumable job, so closing the page pauses it rather than breaking it
- Live progress, an estimate of time remaining, and a stop control
- Numbers with no country code are resolved against a configurable default,
  and anything that cannot be read as a real subscriber number is dropped and
  counted rather than sent
- Duplicate numbers across customer records are collapsed, so a household is
  messaged once
- Link a number by scanning a QR **inside Settings**, no terminal required

</details>

<details open>
<summary><b>Inventory &amp; restock planning</b></summary>

- **Days of cover** per SKU from current stock and observed sales velocity
- **Reorder point** from a stated lead time plus safety stock
- **Suggested order quantity** to reach a healthy cover level
- Status per SKU: out of stock, critical, low, healthy, overstocked, untracked
- **Revenue at risk** if a critical SKU stays out for one lead time
- **Capital tied up** per SKU at selling price, to surface overstock
- Restock planner with reorder / all / overstocked views
- **CSV export** shaped as a draft purchase order
- Every assumption stated on the page rather than buried

</details>

<details open>
<summary><b>Product &amp; catalogue analytics</b></summary>

- **ABC classification** — A carries the first 80% of revenue, B the next 15%
- Pareto concentration chart with the 80% threshold marked
- Revenue, units, orders, distinct customers and average price per SKU
- Units-per-day velocity, refund rate per SKU, average rating
- **Market-basket affinity** — product pairs by support, confidence and lift
- Category revenue and unit mix
- Best sellers by value and by volume; slow movers and never-sold catalogue items

</details>

<details open>
<summary><b>Orders &amp; operations</b></summary>

- Full order register with status, customer, units, totals, discount, shipping,
  tax, refunds, payment method and coupons
- New vs returning flag per order
- **Order status mix** and basket-size distribution
- **Payment method** performance by revenue, share and AOV
- **Trading heatmap** — day of week × hour of day
- Weekday revenue performance
- Average fulfilment time, completion share, cancellation and refund rates

</details>

<details open>
<summary><b>Forecasting</b></summary>

- Daily revenue projection from OLS trend × day-of-week seasonality factors
- **95% confidence band** from in-sample residuals
- Implied pace versus the recent actual run rate
- Weekday seasonality shown explicitly, so the sawtooth is explainable
- Forecast horizon and projected total

</details>

<details open>
<summary><b>Geography</b></summary>

- Revenue, orders, customers and AOV by **country**, **region/state** and **city**
- Share of revenue per location

</details>

<details open>
<summary><b>Search &amp; navigation</b></summary>

- **Command palette** searching customers, products and orders in one place
- Filtering runs before rendering, so tens of thousands of customers stay fast
- Jump to any page, change the date range, re-sync or switch theme from the palette
- **Keyboard shortcuts** throughout, with a discoverable `?` help sheet
- Shortcuts are ignored while typing, so they never eat a search query

</details>

<details open>
<summary><b>Multiple stores</b></summary>

- Connect **several WooCommerce stores** and switch between them
- Switcher in the sidebar; full management in Settings
- Each store keeps its **own credentials, data window and snapshot cache**, so
  switching reads a different cache rather than re-pulling anything
- Re-authorizing a store you already have updates its key in place and keeps the
  data window you chose, rather than adding a duplicate

</details>

<details open>
<summary><b>Reports &amp; exports</b></summary>

- **Ten report types** — executive summary, customer ledger, segmentation,
  products, categories, order register, cohorts, geography, operations, forecast
- **Excel** — one formatted sheet per report, cover page with findings,
  auto-filters, frozen headers, per-cell currency formatting
- **PDF** — branded cover with KPI cards and findings, then a table per report,
  typeset in an embedded Unicode font so every currency symbol renders correctly
- **CSV** — raw rows, BOM-prefixed, formula-injection guarded, spreadsheet-parseable
  dates and bare numbers
- **Report presets** — board pack, CRM upload, merchandising review, finance
  reconciliation, complete export
- Exports always match the on-screen date range and are never row-capped
- **Written report view** at `/reports/view` — conclusion first, evidence below,
  method and limits at the end
- One-click export of whatever page you are on

</details>

<details open>
<summary><b>Connection &amp; security</b></summary>

- **WooCommerce app authorization** (`/wc-auth/v1/authorize`) — approve read-only
  access in your own WordPress admin
- **No form or environment variable anywhere accepts a consumer key**
- HMAC-signed, self-contained state token binds the browser redirect to the
  server-to-server callback, with no shared server state, so the two legs may
  land on different serverless instances
- Credentials verified against the store before being persisted
- Pluggable durable storage — filesystem when self-hosted, Redis on serverless
- Preflight rejects non-HTTPS and non-routable callback addresses **before** you
  approve anything
- Optional password login with HMAC-SHA256 signed session cookies, verified in
  middleware via Web Crypto
- One-click disconnect wipes the key and every cached order
- The WhatsApp gateway key is stored the same way — never in an environment
  variable, never in a browser bundle, and shown only masked once saved
- Customer phone numbers never reach the browser: the analytics payload carries
  only whether someone is reachable, and numbers are resolved server-side at the
  moment a send runs

</details>

<details open>
<summary><b>Interface</b></summary>

- Light and dark themes, both deliberately designed rather than auto-inverted
- Collapsible sidebar, global date-range picker with presets and custom ranges
- Range and granularity persisted across reloads via an external store
  (no flash of the wrong range on load)
- Sortable, searchable, paginated tables with sticky first column and expandable rows
- Charts: trend, Pareto, ranked bar, donut, heatmap, cohort matrix, scatter,
  forecast band, sparkline
- **CVD-validated eight-slot categorical palette**, checked for colour-vision
  separation, normal-vision distinctness, lightness banding and contrast in both
  modes
- Hover tooltips everywhere; legends whenever two or more series are shown
- Honest empty states that explain *why* a section is empty
- Partial-data and truncated-history warnings surfaced, never hidden
- Geist and Geist Mono, with tabular figures in aligned columns

</details>

---

## Feature tour

### Dashboard
Headline KPIs against the equal-length previous window, a revenue-and-orders trend
on a single shared axis, generated findings ordered by urgency, top products and
customers, payment mix, geography, and a day × hour trading heatmap.

### Customers
Full RFM scoring mapped to the ten standard segments. Value tiers, predicted
lifetime value, churn risk, and a Pareto view of revenue deciles with a Gini
coefficient. A top-customer spotlight, an advanced filter panel, and the complete
ledger with orders expandable in place.

### Customer profiles
Every customer table drills through to a profile: their orders, what they bought,
how they were acquired, their RFM scores and full history.

### Acquisition
New versus returning revenue by month, with full sortable tables of each. Channel
and device breakdowns from WooCommerce Order Attribution, which channels actually
bring first-time buyers, and the median time to a second order.

### Campaigns
An audience builder with goal-driven presets. Filter on segment, tier, recency,
spend, orders, churn risk, country and product bought; see reach and revenue at
stake live; export a CSV shaped for an email or ads platform. Plus campaign
performance from `utm_campaign` and coupon return-on-discount.

### WhatsApp campaigns
Compose a text, image or video message and send it to the audience you just
built. A dry run shows exactly who it would reach before anything is sent, a
test send goes only to a number you type, and starting a broadcast needs the
deliverable count typed in. Sending is paced by the gateway and runs as a
resumable job with live progress.

### Inventory
Days of cover per SKU, reorder points from a stated lead time, suggested order
quantities, revenue at risk from stockouts and capital tied up in overstock, with
a CSV export shaped as a draft purchase order.

### Cohorts and retention
Monthly acquisition cohorts with a full retention triangle and a cumulative LTV
curve. Cells that have not elapsed yet stay blank rather than reading as zero.

### Products
ABC classification, refund rate per SKU, category mix, and market-basket affinity
ranked by lift.

### Forecast
Ordinary least squares on the level, multiplied by day-of-week seasonality
factors, with a 95% band from in-sample residuals.

### Orders
Full order register with status mix, basket-size distribution, payment methods,
coupon performance and fulfilment timing.

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `⌘K` / `Ctrl K` | Open search and commands |
| `/` | Open search |
| `?` | Show the shortcut list |
| `⌘⇧R` | Re-sync from WooCommerce |
| `⌘⇧L` | Toggle light and dark |
| `g` `d` | Dashboard |
| `g` `f` | Forecast |
| `g` `c` | Customers |
| `g` `a` | Acquisition |
| `g` `h` | Cohorts and retention |
| `g` `p` | Products |
| `g` `i` | Inventory |
| `g` `o` | Orders |
| `g` `m` | Campaigns |
| `g` `r` | Reports |
| `g` `s` | Settings |

All shortcuts are ignored while you are typing into a field.

---

## Quick start

```bash
git clone https://github.com/nitheeshdr/PulseCommerce.git
cd PulseCommerce
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. The app runs immediately, but every page shows
**"Connect your WooCommerce store"** until one is authorized.

**Requirements:** Node 20+ (developed on 22) and a WooCommerce store with the REST
API enabled. WordPress permalinks must not be set to "Plain", or the REST API
returns 404.

---

## Connecting a store

Connection uses **WooCommerce's own app authorization endpoint**
(`/wc-auth/v1/authorize`). You approve read-only access inside your own WordPress
admin; WooCommerce issues the key and delivers it to this app.

There is deliberately **no form anywhere in this app that accepts a consumer
key**, and no environment variable for one. A merchant pasting a secret into a
third-party form is exactly the failure mode that endpoint exists to remove.

```mermaid
sequenceDiagram
    participant B as Your browser
    participant A as PulseCommerce
    participant W as Your WooCommerce store

    B->>A: Settings → Authorize, enter store URL
    A->>A: Create signed state token
    A-->>B: Redirect to store's authorize page
    B->>W: Log in to WP admin, approve read-only access
    W->>A: POST consumer key + secret (server → server)
    A->>A: Verify token, verify key against store, save
    W-->>B: Redirect back to PulseCommerce
    A-->>B: Connected → dashboard
```

### The one requirement

Notice the **server-to-server POST**. WooCommerce delivers the key from *your
store's server* to this app, which means this app must be on a **public HTTPS
address**:

| Requirement | Why |
|---|---|
| HTTPS | WooCommerce refuses to hand credentials to a plain-HTTP callback. |
| Publicly resolvable | `localhost` points your store's server at itself, not at you — however your browser reaches it. |

The app validates both **before** redirecting you, so you can never get stuck
approving an app that could not have received the result.

### Local development

Serve over local HTTPS and expose it through a tunnel:

```bash
npm run dev:https                                   # https://localhost:3000
cloudflared tunnel --url https://localhost:3000     # or: ngrok http https://localhost:3000
```

Put the public address the tunnel prints into `.env.local`, then restart:

```bash
APP_URL=https://your-subdomain.trycloudflare.com
```

Open the app **at that address**, go to **Settings → Authorize your store**, enter
your store URL and approve.

### Production

```bash
APP_URL=https://analytics.yourcompany.com
```

`APP_URL` is auto-detected on Vercel from `VERCEL_PROJECT_PRODUCTION_URL`.

---

## WhatsApp campaigns

Broadcasts go out through a **self-hosted [OpenWA](https://github.com/rmyndharis/OpenWA)
gateway** that you run. PulseCommerce is only a client of its REST API and never
connects to WhatsApp itself, so your messages, your session and your number stay
on your own infrastructure.

### What you need

A host that can keep a process running continuously. This is the part worth
getting right before anything else:

| | Works | Why |
|---|:---:|---|
| VPS or cloud server | **Yes** | Docker, persistent volumes, a process that stays up |
| Shared hosting | No | The app is restarted or frozen, and the session's auth state does not survive it |
| Vercel / serverless | No | No long-lived process at all |

A WhatsApp session is a live connection. If the process dies or the auth
directory is wiped, the number unlinks and the QR has to be scanned again — and
a broadcast that runs for hours at a safe pace will never finish.

### Setting it up

1. Deploy OpenWA on your server (Docker Compose is its supported path) behind
   HTTPS.
2. Create a session and link a **dedicated number** — see the warning below.
3. In OpenWA, create an API key with the **operator** role. Sending is all this
   needs; do not hand over your admin key.
4. In PulseCommerce, go to **Settings → WhatsApp gateway**, enter the gateway
   URL and that key, and confirm the country code it suggests.

Alternatively, set it on the host instead of in the UI:

```bash
WHATSAPP_API_URL=https://wa.yourdomain.com
WHATSAPP_API_KEY=...            # operator role
WHATSAPP_DIAL_CODE=91           # assumed when a number has no country code
WHATSAPP_SESSION_ID=...         # optional; the only session is adopted if omitted
```

When these are set they take precedence, and Settings shows the connection as
read-only. That is the point: a connection held in the environment survives a
redeploy, a cleared store, and a mis-click on Disconnect.

If no number is linked yet, Settings shows the pairing **QR inline** — scan it
there. The QR is proxied through this app, so the gateway key never reaches a
browser page.

### Sending

On the **Campaigns** page, build an audience as usual, then compose below it.
The order of the controls is the safety model:

1. **Check who this would reach** — a dry run. Resolves the real recipient list
   and sends nothing, reporting how many are reachable, how many were dropped
   and why, a masked sample, and the message as the first real recipient would
   see it.
2. **Test** — one message to a number you type. It cannot reach a customer.
3. **Send broadcast** — requires typing the deliverable count. The server
   re-resolves the audience and refuses if it has changed since you looked.

Sending is paced by the gateway and runs as a resumable job. Closing the page
pauses it; anything already handed over still goes out, and reopening resumes.

### Phone numbers

WooCommerce checkout fields are free text, so numbers arrive inconsistently, and
often with no country code at all. The **default country code** in Settings
decides what a bare national number becomes, which makes it the single setting
most worth checking — a wrong value sends to the wrong country.

Numbers that cannot be read as a plausible subscriber number are **dropped and
counted**, never guessed at. Duplicates across customer records are collapsed so
a household is messaged once, and the opt-out list is applied on the server after
the audience is built.

Numbers themselves never reach the browser. The analytics payload carries only
whether a customer is reachable; the number is resolved server-side at the moment
a send runs.

### Buttons, product cards and link previews

A self-hosted gateway cannot send tappable **buttons** or **product cards**.
Those are WhatsApp Business Platform features that require pre-approved message
templates on Meta's Cloud API, and WhatsApp withdrew them from unofficial
clients — OpenWA's own API marks its catalog endpoints "not supported by any
engine", and a live gateway answers `501` for them.

The closest thing available is WhatsApp's **link preview**: a message whose body
contains a URL renders as a tappable card with the page's title, description and
image. Two things affect whether you get one:

- **Do not attach a photo.** Media suppresses the preview, so the buy link
  appears as plain text under the picture. A text message with the link on its
  own line previews properly.
- **Your product pages need `og:image`.** Without it WhatsApp has no picture to
  draw and the card comes out bare or not at all. Most WordPress SEO plugins
  (Yoast, Rank Math) add these tags from the product image automatically.

If tappable buttons are a hard requirement, the official WhatsApp Business Cloud
API is the only route, at the cost of per-conversation fees and template
approval.

> **Use a dedicated number.** OpenWA connects through reverse-engineered clients
> rather than Meta's official Cloud API, so there is a real risk of the number
> being restricted, and no appeal path through OpenWA. Do not link the number
> your business runs on. Messaging your own past customers is the safest
> workload; cold-blasting strangers is what gets numbers banned.

---

## Multiple stores

Authorize as many stores as you like. Each keeps its own credentials, data window
and snapshot cache.

- **Switch** from the sidebar switcher, or from **Settings → Connected stores**
- **Remove** a single store, or disconnect everything
- Re-authorizing a store you already have **updates its key in place** and keeps
  the data window you chose, rather than adding a duplicate

Switching is a pointer change: the next request reads a different cache rather
than re-pulling anything.

---

## Optional password protection

The app runs open by default, which is what makes "clone and run" work. Set both
variables to require a sign-in:

```bash
AUTH_SECRET=$(openssl rand -hex 32)   # signs the session cookie
APP_PASSWORD=something-long
```

With both set, every analytics route redirects to `/login`. Sessions are
HMAC-SHA256 signed cookies verified in middleware via Web Crypto, so the same code
path runs on Edge and Node.

Completing the WooCommerce authorization also establishes a session — proving you
can approve the store is proof of access. The WooCommerce callback endpoint stays
reachable without a session, because that request is your store calling, not a
browser.

---

## Environment variables

| Variable | Required | Purpose |
|---|:---:|---|
| `APP_URL` | to connect | Public HTTPS address WooCommerce delivers credentials to. Auto-detected on Vercel. |
| `AUTH_SECRET` | **to connect** | Signs the authorization state token and the session cookie. `openssl rand -hex 32`. |
| `APP_PASSWORD` | for login | Set alongside `AUTH_SECRET` to require a password. |
| `KV_REST_API_URL` | on serverless | Redis endpoint. Vercel KV and Upstash both provide it. |
| `KV_REST_API_TOKEN` | on serverless | Token for the above. `UPSTASH_REDIS_REST_*` names work too. |
| `WHATSAPP_API_URL` | no | OpenWA gateway base URL. Setting this and the key below takes the connection out of the UI entirely. |
| `WHATSAPP_API_KEY` | no | Gateway API key, operator role. |
| `WHATSAPP_SESSION_ID` | no | Which session to send from. Omit it and the only session on the gateway is adopted and remembered. |
| `WHATSAPP_DIAL_CODE` | no | Country code assumed for customer numbers stored without one, e.g. `91`. |
| `WHATSAPP_SEND_DELAY_MS` | no | Pause between messages. Default `4000`; the gateway's own floor is `1000`. |

Credentials are **never** environment variables. The issued key is written to
`.data/store-config.json` when self-hosted, or to your Redis on serverless.
`.data/` and `.env*` are gitignored.

---

## Reports and exports

Ten report types, downloadable as:

| Format | What you get |
|---|---|
| **Excel** | One formatted sheet per report, cover page with findings, auto-filters, frozen headers, per-cell currency formats. |
| **PDF** | Branded cover with headline KPI cards and findings, then a table per report. Geist is embedded so `₹`, `€` and friends render correctly. |
| **CSV** | Raw rows for spreadsheets and pipelines: bare numbers, spreadsheet-parseable dates, BOM-prefixed, formula-injection guarded. |

Exports always use the date range currently on screen, so a downloaded report can
never silently disagree with the dashboard it came from. Unlike the on-screen
tables they are **never row-capped**, except in PDF, which prints the columns that
fit a page and says so.

`/reports/view` renders the same period as a written document: conclusion first,
evidence below, method and limits at the end.

---

## How the metrics are defined

Being explicit here matters more than being clever, because these definitions are
where analytics tools quietly disagree with each other.

**Net revenue** — order total less tax, shipping and refunds, counted only for
orders in `completed`, `processing` or `on-hold`. Cancelled, failed and pending
orders are excluded from revenue but still counted in cancellation rates.

**Customer identity** — guest checkouts carry no WooCommerce customer ID, so
buyers are keyed on billing email. Someone checking out under two different
addresses appears twice. On a typical store the large majority of orders are
guest checkouts, so this matters.

**Two different repeat rates**, reported separately and deliberately not
conflated:

- *Returning customer rate* — share of customers active in the period who had
  already bought **before** it.
- *Repeat rate in period* — share who bought more than once **inside** it.

On a 30-day window these differ by an order of magnitude. Any tool showing you one
number called "repeat rate" is hiding this from you.

**New and returning customer lists overlap by design.** A customer acquired in
the period who then buys again is genuinely both: newly acquired, and returning.
Treating them as exclusive made the returning list read as zero on any range
covering the store's full history, since nobody predates it.

**RFM scores** are quintiles within your own customer base, not absolute
thresholds, so segments stay meaningful whatever your absolute numbers look like.

**Predicted CLV** projects each customer's observed order rate forward twelve
months, discounted by churn risk. It is an estimate, and the UI says so.

**Days of cover** is current stock divided by units sold per day over the selected
range. Reorder points assume a lead time plus safety stock, both stated on the
page and adjustable.

**Order Attribution** is core WooCommerce from 8.5. Orders placed before it was
enabled carry none, and the Acquisition page reports the coverage percentage
rather than showing an empty channel list.

**Truncated history** is surfaced as a visible warning rather than silently
skewing every metric.

---

## Architecture

```
src/
├── app/
│   ├── page.tsx          Authorization page (the root)
│   ├── (app)/            Dashboard pages behind the sidebar shell
│   │   ├── dashboard/    Headline KPIs, trend, findings
│   │   ├── customers/    RFM, tiers, CLV, churn, and [key] profiles
│   │   ├── acquisition/  New vs returning, channels, devices
│   │   ├── campaigns/    Audience builder + campaign performance
│   │   ├── cohorts/      Retention triangle, LTV curve
│   │   ├── products/     ABC, refund rate, affinity
│   │   ├── inventory/    Restock planner and reorder points
│   │   ├── orders/       Order register, payments, coupons
│   │   ├── forecast/     Trend + seasonality projection
│   │   ├── reports/      Report builder and written report
│   │   └── settings/     Store connection, switching, data window
│   ├── api/
│   │   ├── analytics/    Computes the full payload
│   │   ├── customers/    One customer with order history, on demand
│   │   ├── whatsapp/     Gateway connection, session + QR, dry run,
│   │   │                 test send, broadcast create/tick/cancel, opt-outs
│   │   ├── auth/woo/     start → callback → return (Woo authorization)
│   │   ├── auth/session/ Password login, sign-out
│   │   ├── reports/      Export generation
│   │   └── settings/     Connection state, switching, data window
│   └── login/
├── lib/
│   ├── woo/              REST client, field trimming, entity decoding,
│   │                     attribution parsing, payload slimming
│   ├── store/            Config, KV abstraction, snapshot loading and caching
│   ├── analytics/        The engine: KPIs, customers, cohorts, acquisition,
│   │                     products, inventory, operations, forecast
│   ├── whatsapp/         OpenWA client, phone normalisation, opt-out list,
│   │                     server-side recipient resolution, broadcast jobs
│   ├── export/           CSV, Excel and PDF builders, embedded fonts
│   ├── auth/             Signed sessions, signed authorization state
│   └── audience.ts       Campaign audience filtering and CSV shaping
├── components/
│   ├── charts/           Chart primitives on a CVD-validated palette
│   ├── dashboard/        Stat strip, data table, badges, filters, page states
│   ├── layout/           Sidebar, topbar, store switcher, command palette
│   ├── whatsapp/         Gateway settings, QR linking, campaign send panel
│   └── ui/               shadcn/ui
└── middleware.ts         Session gate
```

A snapshot is fetched once and every metric is derived from it at request time.
Nothing is precomputed, warehoused, or sent anywhere else.

---

## Performance

Tested against a live store with **20,490 orders and 11,286 customers**:

| Measure | Result |
|---|---|
| Cold instance, empty memory and disk | 3.5 s |
| Warm request | 0.7 s |
| Deployed production request | ~2 s |
| Full-year customer payload, on the wire | 911 KB |
| Cached snapshot | 2.0 MB gzipped |

### What made that possible

**Payload trimming.** WooCommerce's `_fields` parameter does not reach into
nested arrays, so every line item arrived carrying its tax breakdown, `meta_data`
and a full image object. Removing what the engine never reads cut the payload
**81%**, and the whole order history now gzips to 2 MB.

**Shared caching.** The snapshot is cached where every instance can see it,
gzipped and split into chunks behind a manifest, with the chunks written before
the manifest so a reader never sees a partial set. An earlier per-instance cache
meant each cold serverless start re-pulled the entire history, which was both slow
and enough sustained traffic that the store's own security layer began refusing
requests.

**Order history fetched on demand.** Customer records ship without their order
history, which is half a record's weight. That is what lets the ledger list every
customer rather than a capped slice; a profile or an expanded row fetches the one
customer's orders from the cached snapshot.

**Paced, bounded fetching.** Orders paginate three connections wide with a pause
between batches, so a rare full pull reads as steady traffic. Transient failures
retry with exponential backoff, because one dropped connection should not discard
a multi-minute pull.

---

## Design system

Chrome is monochrome by intent, so colour is reserved for data series and genuine
state. Charts use an eight-slot categorical palette validated for colour-vision
deficiency separation, a normal-vision distinctness floor, lightness banding and
contrast — in **both** light and dark mode, with dark steps selected for the dark
surface rather than flipped.

Some deliberate choices:

- **No dual-axis charts.** Where two measures share a plot they share one scale,
  and the tooltip reports true values.
- **Sequential ramps are single-hue**, never rainbow. Diverging pairs use a
  neutral midpoint.
- **Legends are always present for two or more series**, so identity is never
  carried by colour alone. Status colours ship with an icon and a written label.
- **Unelapsed cohort cells are blank**, not zero.
- Typography is Geist and Geist Mono, with tabular figures reserved for columns
  that must align.

---

## Deployment

Any Node host works.

```bash
npm run build
npm run start
```

Set `APP_URL` to the public HTTPS address, and `AUTH_SECRET` + `APP_PASSWORD` if
you want the dashboard gated.

### Serverless (Vercel, Netlify, Lambda)

These platforms have a **read-only filesystem**, so the issued key cannot be
written next to the app. Provision a Redis store and set:

```bash
KV_REST_API_URL=https://your-store.upstash.io
KV_REST_API_TOKEN=...
AUTH_SECRET=...              # required: signs the authorization state token
```

Vercel KV and Upstash both expose exactly these variables; the
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` names are also accepted.

Without a Redis store the app still runs and reports honestly — the connect page
says the deployment cannot save a connection rather than failing mid-flow.

The **snapshot cache** is shared through the same Redis, so cold starts read it
rather than re-pulling from WooCommerce.

---

## Troubleshooting

**"Your store cannot reach this app"** — `APP_URL` points at localhost or a
private network address. The callback is a server-to-server POST from your store.
Use a tunnel and set `APP_URL` to the public address.

**"This deployment cannot save a connection"** — serverless with no Redis
configured. Set `KV_REST_API_URL` and `KV_REST_API_TOKEN`, then redeploy.

**"AUTH_SECRET is not set"** — the authorization flow signs its state token with
it. Generate one with `openssl rand -hex 32`.

**"WooCommerce never delivered the key"** — the store approved the app but the
callback did not arrive. Check `APP_URL` is reachable from the public internet and
that nothing (WAF, firewall, basic auth) blocks the POST.

**"A valid URL was not provided."** — comes from WooCommerce, not this app. It
means the callback or return URL failed validation, usually because `APP_URL` is
unset or malformed.

**REST API returns 404** — WordPress permalinks are set to "Plain". Change them in
Settings → Permalinks.

**Customer records unavailable** — the issued key could not read `/customers`.
Analytics fall back to order billing data and the app says so in a warning.

**No attribution data** — WooCommerce below 8.5, or Order Attribution disabled.
It populates for orders placed after you enable it.

**WhatsApp session keeps dropping / shows "qr_ready"** — the host cannot keep a
process alive, or is not persisting the gateway's data directory, so the auth
state is lost and a fresh QR is offered. Shared hosting and serverless platforms
both do this. Move the gateway to a VPS.

**"The session is not ready"** — the gateway is connected but no number is
linked. Settings shows the pairing QR inline; scan it there.

**Everyone dropped as "unreadable"** — the default country code in Settings is
empty or wrong for your customers' numbers.

**Inventory page empty** — WooCommerce is not tracking stock quantities for the
products that sold. Enable stock management per product, or globally under
WooCommerce → Settings → Products → Inventory.

---

## Scripts

```bash
npm run dev          # http://localhost:3000
npm run dev:https    # https://localhost:3000, needed for the authorize flow
npm run build        # production build
npm run start        # serve the production build
npm run lint         # eslint
```

---

<div align="center">

<br/>

Built by

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/brand/setups-works-white.png">
  <source media="(prefers-color-scheme: light)" srcset="public/brand/setups-works-black.png">
  <img src="public/brand/setups-works-black.png" alt="Setups Works" height="44">
</picture>

<br/>

[setups.works](https://setups.works)

<sub>Read-only by design · self-hosted · your data never leaves your infrastructure</sub>

<sub>Licensed under the <a href="https://opensource.org/licenses/MIT">MIT License</a></sub>

</div>
