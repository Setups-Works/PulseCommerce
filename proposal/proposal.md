# Prepared for Nature's Joy

**Nature's Joy Herbal Cosmetics Private Limited**
naturesjoystore.com

Prepared by **Nitheesh Rajendran**, Setups Works
setups.works

---

# Executive summary
Setups Works proposes to deliver **PulseCommerce**, a private analytics platform
for the Nature's Joy WooCommerce store.

WooCommerce reports on orders. It does not report on customers, cohorts,
marketing channels, or stock risk. That leaves a set of questions unanswered
that directly affect revenue: which customers are worth keeping, which have
quietly stopped buying, where new customers actually come from, which products
are about to run out, and what next month is likely to look like.

PulseCommerce answers those questions from your existing order data, without
adding load to the storefront, without copying customer records to a third
party, and without anyone modelling a database first. It also closes the loop:
an audience identified in the platform can be messaged on WhatsApp from the
same screen, through a gateway Nature's Joy owns.

This document sets out the proposed scope, how the platform connects to your
store, what is delivered, and commercial terms. Two routes are offered: ₹35,000
once with a private WhatsApp gateway and no per-message cost, or ₹25,000 once
with Meta's official Cloud API and roughly ₹10,000 a month in message charges
thereafter.

---

# The opportunity
## What is visible today

The WooCommerce admin shows gross sales by date, a list of top products, and a
handful of counts. It is transaction-centric by design: it reports on orders,
not on the people placing them.

## What is not visible

Questions a growing store needs answered, none of which WooCommerce reports:

**On customers**
- Which customers generate most of the revenue, and how exposed is the business
  if they leave?
- Who has stopped buying without anyone noticing?
- How long does a customer typically take to place a second order, and is the
  business doing anything in that window?
- What proportion of customers ever buy twice?

**On marketing**
- Once a group worth contacting has been identified, how do you actually reach
  them without exporting a spreadsheet and hand-typing numbers?
- Which channel brings genuinely new customers, as opposed to capturing demand
  that already existed?
- What does each channel actually return, per customer rather than per click?
- Are the discount codes profitable, or are they discounting sales that would
  have happened anyway?

**On stock**
- Which products will run out before the next delivery lands?
- How much revenue is at risk if a best-seller stocks out?
- Which products are tying up capital in months of unnecessary cover?

**On the future**
- What is next month likely to look like, and is the store pacing ahead or behind?

Every one of these requires computation across the full order history. None can
be read off a WooCommerce screen.

## Why the usual alternatives do not fit

**Manual spreadsheet exports.** Stale the moment they are produced, and they put
the analytical work on whoever has least time for it.

**General business-intelligence tools.** Capable, but someone has to model
WooCommerce's database before a single question is answered. At this size the
setup cost usually exceeds the value.

**Hosted analytics services.** Convenient, but they copy the entire order
history, including customer names, email addresses, and postal addresses, onto a
third party's servers. That is a data-protection question before it is a cost
question.

**Analytics plugins.** They run heavy queries against the same database that
serves the storefront, which is a reliable way to slow a shop down.

---

# Why PulseCommerce
## Against the tools already in place

| Capability | PulseCommerce | WooCommerce Analytics | Google Analytics |
|---|---|---|---|
| Customer segmentation | Yes | No | No |
| RFM analysis | Yes | No | No |
| Customer lifetime value | Yes | No | No |
| Churn prediction | Yes | No | No |
| Inventory analytics | Yes | Basic | No |
| WhatsApp campaigns | Yes | No | No |
| Customer profiles | Yes | No | No |
| Forecasting | Yes | No | No |
| Self-hosted option | Yes | No | No |
| One-time purchase | Yes | No | No |

## Against the WhatsApp platforms

| Capability | PulseCommerce | AiSensy | WATI | WooCommerce Reports |
|---|---|---|---|---|
| Customer analytics | Yes | No | No | Basic |
| RFM segmentation | Yes | No | No | No |
| Churn prediction | Yes | No | No | No |
| Inventory analytics | Yes | No | No | Basic |
| WhatsApp campaigns | Yes | Yes | Yes | No |
| Shared inbox | Yes | Yes | Yes | No |
| Forecasting | Yes | No | No | No |
| Customer lifetime value | Yes | No | No | No |
| Self-hosted option | Yes | No | No | No |

The messaging platforms send well and know nothing about your customers. The
analytics tools know your customers and cannot message them. This does both,
which is the point: an audience defined by churn risk or by what someone bought
can be messaged without leaving the screen it was defined on.

## What the market charges monthly

| Platform | Starting price | On top of that |
|---|---|---|
| AiSensy | ₹1,500 per month | Meta message charges |
| Gallabox | approximately ₹2,399 per month | Meta message charges |
| Interakt | approximately ₹2,799 per month | Meta message charges |
| WATI | approximately $39 per month (₹3,300+) | Meta message charges |
| Gupshup | Custom pricing | Meta message charges |

Every one of these is a subscription that continues for as long as it is used,
and none of it covers what Meta charges per conversation.

Feature comparisons and prices above reflect publicly available information at
the time of writing. Third-party products and pricing change; verify before
relying on any of it.

---

# Proposed solution
A private analytics platform, running on infrastructure Nature's Joy controls,
reading the store through WooCommerce's official REST API.

Four principles shape it.

## It reads; it writes one thing

The platform reads orders, customers, and products, and nothing about that
changes your store.

There is exactly one exception, and it exists because it was asked for: creating
discount coupons for WhatsApp campaigns. WooCommerce offers no permission
narrower than "read and write", so the restriction is enforced in the software
instead — one function in the codebase creates a coupon, and no path anywhere
modifies an order, a product, a customer, or a store setting.

If coupon creation is not wanted, the access can be reduced to read-only in a
single line and re-approved; every other capability is unaffected.

## No secrets change hands

Access is approved inside your own WordPress admin. WooCommerce issues the key
and delivers it directly to the application. There is deliberately no form in the
product that accepts a key by hand, because a merchant pasting a secret into a
third party's form is the exact risk that approval flow exists to remove.

## Your data stays yours

The application runs on your hosting. The key is held in your storage. Order data
is cached in your infrastructure. Nothing is transmitted to any third-party
analytics service.

## Honest numbers

Where a figure is an estimate, the interface says so. Where a definition could be
read two ways, both are reported and labelled rather than silently merged. Every
metric definition is documented so figures can be reconciled against WooCommerce
rather than taken on trust.

---

# Proposed scope
Thirteen modules.

## 1. Revenue and performance

Net revenue, gross revenue, orders, average order value, units sold, discounts
given, shipping and tax collected, refunds, items per order, revenue per
customer, and cancellation rate. Every figure compared against the equal-length
preceding period. Daily, weekly, or monthly views. Written findings ranked by
urgency, in plain language.

## 2. Customer analytics

- **RFM segmentation** across the ten standard segments, from Champions to Lost,
  scored as quintiles within your own customer base so segments stay meaningful
  as the store grows
- **Value tiers** from VIP through to one-time buyers
- **Predicted lifetime value** per customer
- **Churn risk**, judged against each customer's own reorder rhythm rather than a
  fixed rule, so a monthly buyer and a seasonal buyer are assessed correctly
- **Revenue concentration**: deciles, Pareto curve, and a Gini coefficient
  quantifying how exposed the business is to losing its best customers
- Filtering on segment, tier, spend, order count, churn risk, recency, country,
  and product purchased
- A complete customer ledger, with each customer's orders expandable in place

## 3. Customer profiles

Every customer opens to a full profile: contact details, location, the channel
and device they arrived through, RFM scores, revenue percentile, refunds,
discounts used, what they buy, order value over time, and complete order history.

## 4. Acquisition and retention

- New versus returning revenue by month, with full customer lists for each
- **Channel attribution** using WooCommerce Order Attribution: organic search,
  direct, referral, paid, and campaign traffic
- Which channels bring genuinely first-time buyers rather than repeat demand
- Device breakdown by revenue and average order value
- **Time to second order**, with median, quartiles, and distribution, which
  identifies the window a follow-up should target
- **Cohort retention**: monthly acquisition cohorts tracked over time
- **Cumulative lifetime-value curve**, showing when an acquired customer pays back

## 5. Campaigns and audiences

- An **audience builder** with goal-driven presets: win-back lapsed customers,
  convert one-time buyers to a second order, rescue at-risk high-value customers,
  reward loyal advocates
- Live reach, revenue represented, and value at stake as filters are applied
- **CSV export** shaped for direct import into an email or advertising platform
- **Campaign performance** from UTM tagging, including new-customer share, which
  is the number that matters for paid acquisition
- **Coupon performance**, reporting revenue returned per unit of discount given

## 6. WhatsApp campaigns

Reaching an audience directly, from the same place it is defined.

- Send a **text, image, or video** message to any audience built above
- **Nine ready-made templates**, each written for a specific job: reorder the
  product they buy, announce arrivals in a category they shop, win back a lapsed
  customer, convert a one-time buyer, thank a high-value customer, request a
  review, offer a discount with or without a product, or a plain announcement
- **Personalisation from each customer's own history** — their name, the product
  they have spent the most on, a link to it, its category, when they last
  ordered, how many times they have ordered, and what they have spent
- **Per-customer product photographs**, so each recipient sees the item they
  actually buy rather than a generic image
- **Product search**, to build a campaign around one specific item instead
- **Discount coupons**: use an existing WooCommerce coupon, or create one from
  the campaign screen with an expiry date, a limit of one use per customer, and
  a restriction to the product being promoted. Codes that have expired or reached
  their limit cannot be selected, so a customer is never sent a code that will be
  refused at the checkout
- A **dry run** that resolves the exact recipient list and sends nothing: how
  many are reachable, how many were excluded and for what reason, and the message
  exactly as the first recipient would receive it
- A **test send** to a number entered by hand, which cannot reach a customer
- **Confirmation of the recipient count** before a send begins, re-checked
  against the live audience at the moment it starts
- An **opt-out list** applied after the audience is built, so a filtering mistake
  cannot route around it
- **Paced delivery** with natural spacing, run as a resumable job with live
  progress and a stop control, which recovers by itself if the gateway restarts
  part-way through

**How it connects.** Messages are sent through a WhatsApp gateway running on
infrastructure Nature's Joy controls. Customer numbers are never transmitted to
a third-party messaging service, and never leave the server: the interface works
with counts and reachability, and numbers are resolved only at the moment a
message is sent.

**What this requires.** The gateway is a continuously running service and needs
a small server of its own — shared web hosting cannot keep a WhatsApp connection
alive. Setups Works can provide and manage this, or deploy it on infrastructure
Nature's Joy already has.

**A note on the risk.** This uses a self-hosted gateway rather than Meta's
official WhatsApp Business API. It avoids per-message fees and message template
approval, but the number used carries a risk of restriction by WhatsApp, so a
dedicated number should be used rather than the main business line. Tappable
buttons and product cards are not available on this route; they are a feature of
the official API. If guaranteed delivery or buttons matter more than cost, the
official API is the alternative and can be quoted separately.

### The nine templates

| Template | What it says | When to send it |
|---|---|---|
| Reorder | Names the product they bought, links straight to it | Their usual reorder gap has passed |
| Category arrivals | New items in the range they already shop | You add stock to a category |
| Win back | References their product and when they last ordered | At Risk or Hibernating customers |
| Second order | Asks how they got on, invites a repeat | One-time buyers, still recent |
| VIP thank you | Names their order count, invites a reply | Champions and top-tier customers |
| Review request | Asks for feedback on what they actually buy | Repeat customers with a recent order |
| Coupon and product | A discount tied to their own product | Lapsed customers worth converting |
| Coupon only | A store-wide discount offer | Any audience with no clear favourite |
| Announcement | Your own words, with the greeting still personal | News, opening hours, anything else |

Templates are edited freely before sending. No approval process applies, unlike
Meta's official API.

### The ten variables

Each resolves from that customer's own order history at the moment of sending:

| Variable | Becomes, for one customer |
|---|---|
| name | Priya |
| product | Manjistha Soap |
| product_url | The buy link for that product |
| category | Herbal Soaps |
| last_order | 14 March |
| orders | 7 |
| spend | ₹4,180 |
| store | Nature's Joy |
| coupon | SAVE10NOW |
| coupon_value | 10% off |

The product chosen is the one they have spent the most on, not their most recent
purchase — a one-off small order should not become the thing a reorder message is
built around. A variable with no value for someone is removed and the sentence
tidied afterwards, so nobody receives a literal placeholder or a dangling comma.

### Discount coupons

Coupons are created in WooCommerce directly from the campaign screen, so the code
exists in your store the moment it is generated. Each is limited to one use per
customer, expires on a date you set, and — when a campaign product is chosen — is
restricted to that product so a discount meant for one item cannot be spent across
the catalogue. Generated codes avoid the characters O, 0, I and 1, because they
are read off a phone screen and typed at a checkout.

Codes that have expired or reached their usage limit are shown but cannot be
selected. Sending a code that will be refused at the checkout is worse than
sending none at all.

Coupon performance is reported back: uses, discount given, revenue produced, and
return on discount — so you can see whether an offer bought incremental orders or
simply discounted sales that would have happened anyway.

### How a large send actually runs

Messages go out roughly four seconds apart with random variation, in batches of a
hundred handed to the gateway at a time. A campaign to the full customer base
therefore runs for hours rather than minutes, which is deliberate: sending
thousands of messages in a short window is the single most reliable way to have a
WhatsApp number restricted.

The send is a resumable job. Closing the page pauses it rather than breaking it,
anything already handed over still goes out, and reopening continues from where it
stopped. If the gateway's own process restarts part-way through, the platform
detects it and reconnects by itself rather than failing the remaining recipients.

Every excluded recipient is counted and categorised — no phone number on file, a
number that cannot be read, a duplicate shared with another record, or someone on
the opt-out list — so a result of "sent 9,800 of 11,224" always has an explanation.

## 7. Shared WhatsApp inbox

Replies to a campaign land somewhere the business can see them, alongside who
sent them.

- Every conversation shown with **the customer behind the number**, not a bare
  phone number, together with how many times they have ordered and what they
  have spent
- One click through to that customer's full profile and order history
- Replies arrive without a page refresh
- Send **text, an image or video, or a product from the catalogue** in reply
- **Start a conversation from a phone number**, without waiting to be messaged
  first
- Unread counts and search across names and numbers
- The opt-out list applies here too: someone who asked the business to stop is
  not messaged, whether by a campaign or by hand

The value is context. Answering "is this back in stock?" is a different
conversation when the person asking has ordered eleven times.

## 8. Product and catalogue analytics

ABC classification identifying which products carry the revenue, Pareto
concentration, revenue and units per SKU, refund rate per product, category mix,
best sellers by both value and volume, slow movers, and market-basket analysis
showing which products genuinely sell together.

## 9. Inventory and restock planning

- **Days of cover** per product, from current stock and observed sales velocity
- **Reorder points** calculated from your supplier lead time plus safety stock
- **Suggested order quantities** to reach a healthy cover level
- **Revenue at risk** if a fast-moving product stocks out
- **Capital tied up** in products carrying excessive cover
- Exports as a **draft purchase order**
- Every assumption shown on screen and adjustable to your actual supplier terms

## 10. Orders and operations

Full order register with totals, tax, shipping, discounts, refunds, payment
method, and coupons. Order status mix, basket-size distribution, payment method
performance, a day-by-hour trading heatmap for timing campaigns and staffing,
weekday performance, and fulfilment timing.

## 11. Forecasting

Daily revenue projection combining trend with day-of-week seasonality, presented
with a 95% confidence band. The seasonality is shown explicitly so the projection
can be sense-checked rather than accepted blindly.

## 12. Geography

Revenue, orders, customers, and average order value by country, region, and city.

## 13. Reports and exports

- Ten report types covering every module
- **Excel** workbooks with formatted sheets, filters, and correct currency
  formatting
- **PDF** reports with a cover, headline figures, and findings
- **CSV** for spreadsheets and data pipelines
- Presets for a board pack, CRM upload, merchandising review, and finance
  reconciliation
- A **written report view** presenting a period as a document: conclusion first,
  evidence below, method and limits at the end

## Platform capabilities

Support for connecting more than one store and switching between them, a search
palette covering customers, products, and orders, keyboard navigation, light and
dark themes, and optional password protection.

---

# How it is built
Three separate pieces, only one of which is the application.

```
   Your WooCommerce store                    Your WhatsApp gateway
            |                                          ^
            | read (+ coupon writes)                   | send
            v                                          |
   +--------------------------------------------------+----+
   |                    PulseCommerce                       |
   |                                                        |
   |   pulls order history  ->  one cached snapshot         |
   |                                |                       |
   |                                v                       |
   |            every metric computed from that snapshot    |
   |                                |                       |
   |                                v                       |
   |               dashboards, reports, audiences           |
   +--------------------------------------------------------+
                                    |
                                    v
                            Your browser
              (counts and names; never phone numbers)
```

**One pull, then everything.** Metrics like cohort retention and lifetime value
need the whole order history, not a page of it. The platform pulls once, caches
the result, and computes every figure from that cache — which is why changing a
date range is instant rather than another wait on the store.

**The storefront is never in the path.** Analysis runs against the cached copy,
so no customer ever waits on a query the business is running.

**Numbers stay on the server.** The browser receives names and counts. Phone
numbers are resolved only at the moment a message is sent, which means a
mistake in the interface cannot expose the customer list.

**Sending is resumable.** A campaign to a large audience takes hours at a safe
pace. It runs as a job that records its position, so closing the page pauses it
rather than losing it, and a restart of the gateway costs a short delay rather
than the remainder of the audience.

---

# How access works
1. You enter your store address in the application.
2. You are sent to your own WordPress admin, where you review and approve
   **read-only** access.
3. WooCommerce issues a key and delivers it directly to the application.
4. The application verifies the key against the store before storing it.

No password is shared. No key is emailed. Access can be revoked at any time,
either from within the application or from WordPress itself. Disconnecting
removes the stored key and every cached order.

---

# Deliverables
1. **The platform**, covering the thirteen modules above.
2. **Source code**, in a repository Nature's Joy owns.
3. **Deployment** to the agreed hosting, configured and verified against the live
   store.
4. **Documentation** covering setup, connection, configuration, architecture, and
   troubleshooting.
5. **Metric definitions in writing**, so every figure can be reconciled against
   WooCommerce.
6. **Handover session** covering day-to-day use and how to read each module.

## Hosting options

**Managed by Setups Works.** Hosting, monitoring, and updates handled on your
behalf, including the WhatsApp gateway. Nothing for your team to operate.

**Nature's Joy infrastructure.** Any host running Node. Best performance, as the
data cache persists between requests.

**Serverless.** Lowest operational overhead, using a managed cache. Suitable for
most catalogue sizes.

---

# Commercial terms

Two routes. They deliver the same thirteen modules, the same deployment,
documentation, handover and source code. They differ in one thing: whether you
keep paying to send messages.

| | Private WhatsApp gateway | WhatsApp Cloud API |
|---|---|---|
| **One-time fee** | **₹35,000** | **₹25,000** |
| **Then** | **Nothing** | **≈ ₹10,000 every month** |
| Cost per message | None | Charged by Meta, per conversation |
| Message templates | Written and sent immediately | Require Meta's approval first |
| Delivery | Not guaranteed | Guaranteed by Meta |
| Tappable buttons | Not available | Available |
| Running cost | Server hosting, ≈ ₹500 per month | Meta's per-conversation charges |
| Setup | Scan a QR code | Meta Business verification |

## What "≈ ₹10,000 every month" means

The ₹25,000 fee covers the platform. The messages themselves are billed by Meta,
per conversation, and that charge never stops.

One campaign a month to your 11,224 customers costs roughly ₹10,000 at current
marketing rates — approximately ₹1,20,000 a year, paid to Meta rather than to
Setups Works. Send more often and it rises proportionally.

Meta sets these rates, varies them by country and message category, and changes
them without notice. The figure above is an illustration at roughly ₹0.89 per
marketing conversation and should be confirmed against Meta's published pricing.

## What the private gateway costs to run

Nothing per message. The ₹35,000 covers the platform and a dedicated WhatsApp
messaging server on infrastructure Nature's Joy controls. The only running cost
is that server, approximately ₹500 a month, billed by your hosting provider.

## Three years, compared

One campaign a month to 11,224 customers, with Meta charges at approximately
₹10,000 a month for every route that pays them:

| Route | Fee or subscription | Meta charges | Three-year total |
|---|---|---|---|
| AiSensy | ₹54,000 | ₹3,60,000 | ₹4,14,000 |
| Gallabox | ₹86,364 | ₹3,60,000 | ₹4,46,364 |
| Interakt | ₹1,00,764 | ₹3,60,000 | ₹4,60,764 |
| WATI | ₹1,18,800 | ₹3,60,000 | ₹4,78,800 |
| PulseCommerce + Cloud API | ₹25,000 once | ₹3,60,000 | ₹3,85,000 |
| **PulseCommerce + private gateway** | **₹35,000 once** | **₹0** | **₹53,000** |

Against the cheapest subscription platform, the private gateway saves
approximately ₹3,61,000 over three years. The saving is not the build fee. It is
the per-message charge ceasing to apply.

## What is not in this price

The fee covers the thirteen modules described in this document and nothing
beyond them. Anything additional is quoted separately before any work on it
begins, so there are no unexpected charges:

| Additional work | How it is charged |
|---|---|
| A new module not listed in the thirteen | Quoted per module, on scope |
| Custom metrics or reports specific to your business | Quoted on scope |
| Integrations with other systems — ERP, courier, accounting | Quoted on scope |
| Scheduled or automated campaign triggers | Quoted on scope |
| Ongoing support and maintenance | Monthly retainer, agreed separately |
| Managed hosting of the platform or gateway | Monthly, agreed separately |
| Changes requested after handover | Day rate, agreed separately |

Nothing in this list is required for the platform to work. Every one of them is
optional, and none will be started without a written quotation you have accepted.

**Payment schedule:** to be agreed in writing before work commences.

**Timeline:** to be confirmed on acceptance.

**Validity:** this quotation is valid for 30 days from the date of issue.

---

# Optional extensions
Available separately, either at the outset or later.

- **Scheduled reports** delivered by email weekly or monthly
- **Stock alerts** when a product crosses its reorder point, so a fast-moving
  product cannot run out unnoticed
- **Direct email-platform integration**, so audiences sync automatically rather
  than being exported and imported
- **Official WhatsApp Business API**, in place of the self-hosted gateway, where
  guaranteed delivery is worth per-message fees and template approval
- **Profitability analysis**, given cost-of-goods data, turning revenue figures
  into margin
- **Multi-currency consolidation**, should trading extend beyond INR
- **Additional stores**, supported by the platform without further development

---

# Next steps
1. Review the scope above and confirm which modules and options are wanted.
2. Agree commercial terms and schedule.
3. **Walkthrough.** On acceptance, Setups Works will demonstrate the platform
   against Nature's Joy data so the findings can be seen before rollout.
4. Deployment, verification, and handover.

---

# Appendix: complete feature list
Everything included in the thirteen modules, listed so nothing delivered goes
unmentioned.

**Revenue and performance.** Net and gross revenue, orders, average order value,
units, discounts, shipping, tax, refunds, items per order, revenue per customer,
cancellation rate, period-on-period comparison, daily, weekly and monthly views,
sparkline trends, and written findings ranked by urgency.

**Customer analytics.** RFM scoring, ten segments, five value tiers, predicted
lifetime value, churn risk, revenue deciles, Pareto curve, Gini coefficient,
recency-frequency plot, top-customer spotlight, ready-made high value, low value,
at risk and rising cohorts, and a complete ledger with orders expandable in place.

**Customer profiles.** Contact details, location, acquisition channel and device,
RFM scores, revenue percentile, refunds, discounts used, what they buy ranked by
revenue, order value over time, and full order history.

**Acquisition and retention.** New versus returning revenue, full customer tables,
channel attribution, first-time buyer analysis by channel, device breakdown, pages
per session, time to second order with quartiles, monthly cohort retention, the
cumulative lifetime value curve, and attribution coverage.

**Campaigns and audiences.** Audience builder with live reach, six goal presets,
filters on segment, tier, recency, spend, order count, churn risk, country, account
type, product purchased and contactability, revenue and predicted value at stake,
CSV export for email and advertising platforms, campaign performance from UTM tags,
and coupon return on discount.

**WhatsApp campaigns.** Text, image and video messages, nine templates, ten
personalisation variables, per-customer product photographs, catalogue product
search, coupon creation and attachment, dry run, test send, typed confirmation,
opt-out list, paced sending with variation, resumable jobs, automatic recovery,
live progress and a stop control.

**Shared inbox.** Conversations matched to customers, order count and lifetime
spend beside each, link to the full profile, live reply polling, text, media and
product replies, starting a conversation from a number, unread counts, search
across names and numbers, and opt-out enforcement.

**Product and catalogue analytics.** ABC classification, Pareto concentration,
revenue, units, orders and distinct customers per product, average price and
velocity, refund rate per product, average rating, market-basket affinity by lift,
category mix, best sellers by value and volume, slow movers and never-sold items.

**Inventory and restock planning.** Days of cover, reorder points from your supplier
lead time, suggested order quantities, out of stock, critical, low, healthy and
overstocked states, revenue at risk, capital tied up, a restock planner, and a
draft purchase order export.

**Orders and operations.** Full order register, status mix, basket-size
distribution, payment method performance, a day-by-hour trading heatmap, weekday
performance and fulfilment timing.

**Forecasting and geography.** Daily revenue projection, 95% confidence band,
weekday seasonality shown explicitly, and revenue, orders, customers and average
order value by country, state and city.

**Reports and exports.** Ten report types, Excel with formatted sheets, filters and
currency formats, PDF with cover, headline figures and findings, CSV for
spreadsheets and pipelines, presets for a board pack, CRM upload, merchandising
review and finance reconciliation, a written report view, and exports that match
the on-screen date range without truncation.

**Platform.** Multiple stores with instant switching, a command palette across
customers, products and orders, keyboard navigation throughout, light and dark
themes, persisted date ranges, sortable, searchable and expandable tables, optional
password protection, honest empty states, and partial-data warnings surfaced rather
than hidden.

**Security.** Approval inside your own WordPress admin, no credential ever typed
into a form in this product, verification before saving, keys shown only masked,
customer phone numbers never sent to the browser, opt-outs enforced on the server,
and a one-click disconnect that wipes the stored key and every cached order.

---

# Appendix: how key figures are defined
Included so that, once delivered, every number can be reconciled against
WooCommerce rather than taken on trust. These are the definitions where
analytics tools most often disagree with each other.

**Net revenue.** Order total less tax, shipping, and refunds, counted only for
orders in completed, processing, or on-hold status. Cancelled, failed, and
pending orders are excluded from revenue while still counting toward
cancellation rates.

**Customer identity.** Guest checkouts carry no WooCommerce customer ID, so
buyers are identified by billing email address. A customer ordering under two
different email addresses will appear as two customers. On most stores the
majority of orders are guest checkouts, so this materially affects customer
counts and should be understood when reading them.

**Returning customer rate.** The share of customers active in a period who had
already purchased before it began.

**Repeat rate in period.** The share of customers who purchased more than once
inside the period itself. On a short window this differs from the returning
customer rate by a wide margin. Both are reported separately and labelled,
because conflating them is a common source of misleading retention figures.

**RFM scores.** Recency, frequency, and monetary values scored as quintiles
within the store's own customer base rather than against absolute thresholds, so
segments remain meaningful regardless of the store's size.

**Predicted lifetime value.** Each customer's observed purchase rate projected
twelve months forward, discounted by their churn risk. An estimate, and presented
as one.

**Days of cover.** Current stock divided by units sold per day over the selected
period. Reorder points add a supplier lead time and a safety-stock buffer, both
configurable to your actual terms.

**Forecast.** A least-squares trend multiplied by day-of-week seasonality
factors, with a 95% interval derived from historical variance. It answers whether
the store is pacing ahead of or behind its recent trend. It has no knowledge of
planned promotions, stockouts, or seasonality outside the period analysed.

---

---

# Terms and conditions
## About the figures

All store figures in this document were computed from naturesjoystore.com covering
1 August 2025 to 31 July 2026, across 20,444 orders retrieved through the
WooCommerce REST API. Figures change as the store trades and should be re-run
before being relied upon.

Net revenue is order total less tax, shipping and refunds, counting only orders in
completed, processing or on-hold status. Cancelled, failed and pending orders are
excluded from revenue but included in cancellation rates. This may differ from
figures shown elsewhere in WooCommerce, which counts differently.

Guest checkouts carry no WooCommerce customer identifier, so buyers are identified
by billing email address. One person ordering under two email addresses counts as
two customers, which affects customer counts and repeat rates.

## About projections

Win-back revenue, campaign returns, break-even points and forecasts are
illustrations based on stated assumptions. They are not forecasts, guarantees,
warranties or commitments of any kind, and actual results will differ, potentially
materially.

Predicted lifetime value and churn risk are estimates derived from observed
purchase behaviour. Forecasts use a least-squares trend with day-of-week
seasonality and have no knowledge of planned promotions, stock availability, price
changes or seasonality outside the period analysed.

Days of cover and revenue at risk are calculated from observed sales velocity and
current stock levels where WooCommerce tracks them. Products without stock
management enabled cannot be planned for.

## About WhatsApp delivery

Messaging uses a self-hosted gateway connecting through unofficial,
reverse-engineered clients rather than Meta's official WhatsApp Business API.
Message delivery is not guaranteed.

WhatsApp may, at its sole discretion and without notice, restrict, suspend or
permanently ban any number used for automated messaging. No appeal route exists
through this software or through Setups Works. A number reserved for this purpose
must be used, never the primary business line. Setups Works accepts no liability
for the restriction, loss or suspension of any number, for messages that fail to
deliver, or for consequential business loss arising from either.

Tappable buttons and product cards are features of Meta's official API and cannot
be delivered by a self-hosted gateway. They are excluded from this scope.

You are responsible for ensuring messages sent comply with applicable law,
including consent, data protection and unsolicited-communication rules in the
recipient's jurisdiction, and with WhatsApp's own terms. The opt-out list is
provided as a tool; honouring requests to stop remains your obligation.

## About third-party costs

WhatsApp Cloud API rates are set by Meta, vary by country and message category,
and change without notice. Any rates shown are illustrative ranges rather than
quotations; confirm current pricing with Meta before making a decision on that
basis.

Server hosting for the WhatsApp gateway, estimated at approximately ₹500 per
month, is billed by your hosting provider and is not included in the quoted price.
A dedicated phone number for WhatsApp sending is also not included. Domain, SSL
and WooCommerce hosting remain your existing arrangements.

The WhatsApp gateway is independent open-source software provided under its own
licence and maintained by its own authors. Setups Works does not control its
development, its availability, or its continued compatibility with WhatsApp.

## About your data

All store and customer data remains the property of Nature's Joy and stays on
infrastructure you control. No data is transmitted to Setups Works or to any
third-party analytics or messaging service.

Store access is read-only with a single exception: creating the discount coupons
you request. Nothing modifies an order, a product, a customer or a store setting.
Access can be revoked at any time from WordPress without notice to us.

## About this quotation

The quoted fee covers the build, deployment, configuration, documentation and
handover of the thirteen modules described in this document. Source code is
delivered to a repository owned by Nature's Joy. Work outside this scope,
including additional modules, custom metrics, integrations or ongoing support, is
quoted separately.

This quotation is valid for 30 days from the date of issue. Payment terms to be
agreed in writing before work commences.

---

<div style="text-align:center; margin-top:3rem;">

<img src="https://crm.setups.works/uploads/company/bd02979422e6ebfe486aa19a208b6b73.png" alt="Setups Works, the digital agency" width="260" />

**Nitheesh Rajendran**
Founder and Developer

[setups.works](https://setups.works) · [linkedin.com/in/nitheeshdr](https://www.linkedin.com/in/nitheeshdr/)

</div>