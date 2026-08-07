-- Seed: the marketing site's current content, moved into the database verbatim.
--
-- This migration is what makes "the landing page is now dynamic" true without
-- the page changing appearance by a single pixel. Every string below is copied
-- from the component that used to hold it, so the first render after `db push`
-- is identical to the render before it.
--
-- Idempotent throughout: `on conflict do nothing` on natural keys, so
-- re-running against a database that already has content is a no-op rather
-- than a duplicate. That matters because `supabase db push` is the only way
-- content reaches a fresh environment.
--
-- Two blocks carry content that is deliberately NOT finished, and both are
-- seeded as drafts rather than published so they cannot reach the public site
-- by accident:
--
--   * pricing amounts — placeholders, not a commercial decision
--   * testimonials    — no quote came from a customer
--
-- The pricing tiers are published because the landing page already shows them
-- with an on-page note; the testimonials are not.

-- ---------------------------------------------------------------------------
-- Organization and company
-- ---------------------------------------------------------------------------

insert into public.organizations (slug, name)
values ('pulsecommerce', 'PulseCommerce')
on conflict (slug) do nothing;

insert into public.company (
  name, tagline, description, email, social_links, copyright_notice, status
)
values (
  'PulseCommerce',
  'AI Commerce Intelligence Platform',
  'AI commerce intelligence for WooCommerce stores that would rather act on their numbers than read them.',
  'hello@pulsecommerce.io',
  '[
     {"label": "GitHub", "href": "https://github.com", "icon": "github"},
     {"label": "X", "href": "https://x.com", "icon": "x"},
     {"label": "Email us", "href": "mailto:hello@pulsecommerce.io", "icon": "mail"}
   ]'::jsonb,
  '© 2026 PulseCommerce. Self-hosted, and yours.',
  'published'
)
on conflict do nothing;

insert into public.landing_settings (
  primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href, status
)
values ('Connect your store', '/connect', 'See WhatsApp in action', '/whatsapp', 'published')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Announcement
-- ---------------------------------------------------------------------------

insert into public.announcements (message, badge_label, href, link_label, status, position)
values (
  'Flows and the AI assistant are live',
  'New',
  '/features/ai',
  'See the agent',
  'published',
  0
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Heroes, one per route
-- ---------------------------------------------------------------------------

insert into public.hero_sections (
  route, eyebrow, headline, headline_accent, headline_after, subheadline,
  primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href,
  trust_points, status
)
values
  (
    '/',
    'Flows and the AI assistant are live',
    'Know who buys.',
    'Win them back',
    'on WhatsApp.',
    'WooCommerce tells you what sold. PulseCommerce tells you who bought it, which of them is slipping away, and what to say to bring them back — from one screen.',
    'Connect your store', '/connect', 'See WhatsApp in action', '/whatsapp',
    array['Read-only access', 'No per-message fee', 'Self-hosted', 'Your data stays yours'],
    'published'
  ),
  (
    '/features',
    'Thirteen modules, all included',
    'Everything is computed from',
    'your own orders.',
    null,
    'There is no sample data anywhere in the product. Connect a store and every figure below is derived from one cached snapshot of your real order history.',
    'Connect your store', '/connect', 'See pricing', '/pricing',
    '{}',
    'published'
  ),
  (
    '/features/ai',
    'The assistant',
    'It proposes.',
    'You approve.',
    null,
    'Ask about the business in plain English. The assistant reads your real figures, drafts the message, and then stops — nothing leaves until you approve the card in front of you.',
    'Connect your store', '/connect', 'See campaigns', '/features/campaigns',
    '{}',
    'published'
  ),
  (
    '/features/campaigns',
    'Campaigns',
    'An audience is a filter,',
    'not a list you maintain.',
    null,
    'Stack segment, value tier, product and recency filters over your live analytics. The count updates as you go, nothing is exported, and the list resolves at send time — so it can never be stale.',
    'Connect your store', '/connect', 'See the assistant', '/features/ai',
    '{}',
    'published'
  ),
  (
    '/whatsapp',
    'The half your customer sees',
    'The message names the thing',
    'they actually buy.',
    null,
    'Personalised from each customer''s own order history — the item they spend most on, its photograph, and a link straight to it. Write once; everyone gets their own.',
    'Connect your store', '/connect', 'Compare delivery routes', '/pricing#delivery',
    '{}',
    'published'
  ),
  (
    '/integrations',
    'Connects to what you already run',
    'One store to connect.',
    'Nothing to migrate.',
    null,
    'You approve read-only access inside your own WordPress admin. No password is shared, no key is emailed, and disconnecting wipes every cached order.',
    'Connect your store', '/connect', 'Read the API docs', '/api-docs',
    '{}',
    'published'
  ),
  (
    '/pricing',
    'Every module, every tier',
    'One price.',
    'No feature gates.',
    null,
    'Tiers are sized by how much history you have, not by what the product will tell you about it. A small store gets the same thirteen modules as a large one.',
    'Connect your store', '/connect', null, null,
    '{}',
    'published'
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- The thirteen modules
-- ---------------------------------------------------------------------------

insert into public.features (collection, title, description, icon, metric, metric_unit, position, status)
values
  ('modules', 'Revenue analytics', 'Every KPI against the equal-length previous period, with the trend behind it.', 'BarChart3', 12, 'months compared', 0, 'published'),
  ('modules', 'Customer intelligence', 'RFM segmentation across recency, frequency and monetary value.', 'Users', 10, 'segments', 1, 'published'),
  ('modules', 'Customer lifetime value', 'Predicted spend per customer, discounted by their own churn risk.', 'LineChart', 5, 'value tiers', 2, 'published'),
  ('modules', 'Churn prediction', 'Judged against each customer''s own reorder cadence, not a flat cutoff.', 'Compass', 4, 'risk bands', 3, 'published'),
  ('modules', 'Cohort analysis', 'Every month of acquisition followed forward, so you can see where people stop.', 'ChartColumnBig', 36, 'months tracked', 4, 'published'),
  ('modules', 'Acquisition', 'Which channels bring first-time buyers, and the time to a second order.', 'Compass', 8, 'channels', 5, 'published'),
  ('modules', 'Product analytics', 'ABC classification and market-basket affinity across the catalogue.', 'Boxes', 3, 'ABC classes', 6, 'published'),
  ('modules', 'Inventory intelligence', 'Days of cover from real velocity, reorder points, and the revenue behind each shortage.', 'Warehouse', 1, 'restock plan', 7, 'published'),
  ('modules', 'Revenue forecasting', 'Projected revenue with a confidence band, from your own trading history.', 'LineChart', 90, 'days ahead', 8, 'published'),
  ('modules', 'WhatsApp campaigns', 'Audiences that resolve at send time, personalised per customer, with a dry run.', 'Megaphone', 10, 'templates', 9, 'published'),
  ('modules', 'Automated flows', 'Multi-step sequences days apart that drop the rest once a customer orders.', 'Workflow', 0, 'double-sends', 10, 'published'),
  ('modules', 'AI commerce agent', 'Ask in plain English. It reads your figures and drafts; you approve.', 'Bot', 0, 'phone numbers in scope', 11, 'published'),
  ('modules', 'Business intelligence', 'Build and download the whole picture as PDF, Excel or CSV.', 'FileDown', 10, 'report types', 12, 'published')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Enterprise feature grid
-- ---------------------------------------------------------------------------

insert into public.features (collection, title, description, icon, position, status)
values
  ('enterprise', 'One snapshot, every metric', 'Your order history is pulled once and cached. Every figure is derived from that snapshot, so changing the date range is instant rather than another round trip.', 'Database', 0, 'published'),
  ('enterprise', 'Authorised in your own admin', 'WooCommerce''s app-authorization screen, read-only. No password is shared and no key is emailed.', 'KeyRound', 1, 'published'),
  ('enterprise', 'Phone numbers never reach the browser', 'They are resolved server-side at the moment a message is sent, and are absent from everything the assistant can read.', 'Fingerprint', 2, 'published'),
  ('enterprise', 'Exports that survive a board meeting', 'Ten report types as PDF, Excel or CSV, with the same figures and the same formatting as the screen.', 'Download', 3, 'published'),
  ('enterprise', 'Every customer, not a capped slice', 'Sortable, filterable and exportable in full. No top-100 ceiling hiding the long tail where churn actually happens.', 'Table2', 4, 'published'),
  ('enterprise', 'Disconnect wipes everything', 'Removing a store deletes its credentials and every cached order with it, in the same action.', 'RefreshCw', 5, 'published'),
  ('enterprise', 'Command palette and shortcuts', 'Every screen reachable from the keyboard, with a palette on the same chord you already use everywhere else.', 'Keyboard', 6, 'published'),
  ('enterprise', 'Light and dark, properly', 'Two tuned palettes rather than an inverted one — including the eight-slot chart palette, restepped for each surface.', 'Moon', 7, 'published'),
  ('enterprise', 'Colour that means something', 'A validated categorical palette that clears colour-vision separation, assigned in fixed order so a series keeps its colour when a filter changes.', 'Layers', 8, 'published'),
  ('enterprise', 'Flows that run on a schedule', 'Steps land days apart, customers join as they qualify, nobody enters twice, and the rest is dropped once they buy.', 'Clock', 9, 'published'),
  ('enterprise', 'Your own WhatsApp host, or Meta''s', 'The analytics, flows, assistant and inbox are identical either way. Only the carrier changes.', 'Wifi', 10, 'published'),
  ('enterprise', 'A REST API and OpenAPI schema', 'Everything the interface reads is available over the same documented API, with a browsable reference.', 'Gauge', 11, 'published')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Analytics modules (the "every tier includes" list)
-- ---------------------------------------------------------------------------

insert into public.analytics_modules (name, slug, description, position, status)
values
  ('Revenue, orders and repeat rate', 'revenue', 'Headline KPIs against the prior period.', 0, 'published'),
  ('RFM segmentation and value tiers', 'rfm', 'Ten segments, five tiers.', 1, 'published'),
  ('Predicted lifetime value', 'clv', 'Discounted by churn risk.', 2, 'published'),
  ('Cohort retention', 'cohorts', 'Month by month.', 3, 'published'),
  ('Acquisition channels', 'acquisition', 'Where first-time buyers come from.', 4, 'published'),
  ('Product performance and ABC classes', 'products', 'Across the catalogue.', 5, 'published'),
  ('Market-basket affinity', 'affinity', 'What sells together.', 6, 'published'),
  ('Inventory cover and reorder points', 'inventory', 'From real velocity.', 7, 'published'),
  ('B2B account rollups', 'b2b', 'Grouped by company.', 8, 'published'),
  ('WhatsApp campaigns', 'campaigns', 'Personalised per customer.', 9, 'published'),
  ('Automated flows', 'flows', 'Sequences that stop when they buy.', 10, 'published'),
  ('The assistant', 'assistant', 'Proposes; you approve.', 11, 'published'),
  ('Report exports (PDF, Excel, CSV)', 'exports', 'Every screen is also a document.', 12, 'published')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Pricing
--
-- PLACEHOLDER AMOUNTS — structure, not a commercial decision. Published
-- because the page already carries an on-page note saying so.
-- ---------------------------------------------------------------------------

insert into public.pricing_plans (
  name, slug, blurb, amount, currency, cadence, price_label,
  is_highlighted, cta_label, cta_href, limits, position, status
)
values
  (
    'Starter', 'starter', 'One store, and the full product.',
    1499, 'INR', 'per month', null, false, 'Start free', '/connect',
    array['1 connected store', 'Up to 2,000 orders of history', '12 months of history', 'Email support'],
    0, 'published'
  ),
  (
    'Growth', 'growth', 'The tier most stores settle on.',
    3999, 'INR', 'per month', null, true, 'Start free', '/connect',
    array['3 connected stores', 'Up to 50,000 orders of history', '36 months of history', 'Priority support'],
    1, 'published'
  ),
  (
    'Self-hosted', 'self-hosted', 'Run it on your own infrastructure.',
    null, 'INR', 'forever', 'Free', false, 'Read the docs', '/api-docs',
    array['Unlimited stores', 'Unlimited history', 'Your own database', 'Community support'],
    2, 'published'
  )
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- FAQs
-- ---------------------------------------------------------------------------

insert into public.faqs (question, answer, show_on_landing, position, status)
values
  ('What access does it need to my store?', 'Read-only, approved by you inside your own WordPress admin through WooCommerce''s app-authorization screen. No password is shared and no key is emailed. The one thing written back is a coupon, and only when you create one.', true, 0, 'published'),
  ('Where does my customer data go?', 'Nowhere. Orders are cached on your own deployment and every metric is computed from that cache. Phone numbers are never sent to the browser and are resolved server-side at the moment a message is sent.', true, 1, 'published'),
  ('Can the assistant message my customers on its own?', 'No. It reads freely and changes nothing. Sending anything arrives as a card you approve, and approving runs the same guarded route a person would use. There is no tool for messaging your whole customer base.', true, 2, 'published'),
  ('How long does the first load take?', 'One pull of your full order history, which takes a few minutes on a large store. After that every figure is instant, including changing the date range, because nothing is fetched again.', true, 3, 'published'),
  ('What if WhatsApp restricts my number?', 'On the self-hosted route that is a real risk, which is why a dedicated number is essential — never your main business line. The Cloud API route removes the risk and adds a per-conversation charge instead.', true, 4, 'published'),
  ('Is Shopify supported?', 'Not yet. The engine reads a normalised snapshot rather than WooCommerce directly, so adding a platform is an adapter rather than a rewrite — but it is honest to say it does not exist today.', true, 5, 'published'),
  ('Do I pay per message?', 'Not to us, on any tier. If you run your own WhatsApp host there is no per-message fee at all. If you use the official Cloud API, Meta charges you per conversation directly.', false, 6, 'published'),
  ('Can I cancel?', 'Yes, at any time, and disconnecting a store deletes its credentials and every cached order with it.', false, 7, 'published')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Testimonials
--
-- SEEDED AS DRAFTS. None of these came from a customer. They are the shape and
-- length the section is built for, and `is_verified` stays false until someone
-- confirms a real, attributed, permitted quote. Draft status means RLS keeps
-- them off the public site until then.
-- ---------------------------------------------------------------------------

insert into public.testimonials (quote, author_role, author_context, is_verified, position, status)
values
  ('We knew revenue was flat. We did not know that a third of last year''s buyers had quietly stopped, or that they all bought the same two consumables.', 'Founder', 'Home & living store', false, 0, 'draft'),
  ('The dry run is the feature. Being able to resolve the real list and send nothing meant we actually trusted it enough to press send.', 'Head of growth', 'Supplements brand', false, 1, 'draft'),
  ('Our win-back used to be a spreadsheet and an afternoon. It is now a filter, and the sequence stops itself the moment somebody orders.', 'Marketing lead', 'Speciality foods', false, 2, 'draft'),
  ('Days of cover computed from real velocity, rather than a flat low-stock threshold, changed which products we reorder first.', 'Operations manager', 'Multi-brand retailer', false, 3, 'draft'),
  ('The assistant drafting the message and then waiting is the right way round. I have never once wanted an AI to message my customers unsupervised.', 'Founder', 'Skincare store', false, 4, 'draft'),
  ('Running the WhatsApp host ourselves meant no per-message fee at the volume we send, which is the entire reason the numbers work.', 'Technical lead', 'Direct-to-consumer brand', false, 5, 'draft')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Partners (the works-with band)
-- ---------------------------------------------------------------------------

insert into public.partners (name, icon_slug, category, position, status)
values
  ('WooCommerce', 'woocommerce', 'stack', 0, 'published'),
  ('WordPress', 'wordpress', 'stack', 1, 'published'),
  ('WhatsApp', 'whatsapp', 'stack', 2, 'published'),
  ('Meta', 'meta', 'stack', 3, 'published'),
  ('Stripe', 'stripe', 'stack', 4, 'published'),
  ('Razorpay', 'razorpay', 'stack', 5, 'published'),
  ('Google Analytics', 'googleanalytics', 'stack', 6, 'published'),
  ('Google Sheets', 'googlesheets', 'stack', 7, 'published')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Integrations
-- ---------------------------------------------------------------------------

insert into public.integrations (name, slug, description, icon_slug, availability, ring, position, status)
values
  ('WooCommerce', 'woocommerce', 'Authorised through WooCommerce''s own app-authorization screen inside your WordPress admin, read-only.', 'woocommerce', 'available', 'inner', 0, 'published'),
  ('WhatsApp', 'whatsapp', 'Your own host, or the official Cloud API. The product works identically either way.', 'whatsapp', 'available', 'inner', 1, 'published'),
  ('WordPress', 'wordpress', 'The admin the authorization happens in.', 'wordpress', 'available', 'inner', 2, 'published'),
  ('Meta', 'meta', 'The official WhatsApp Cloud API, with delivery backed by Meta.', 'meta', 'available', 'inner', 3, 'published'),
  ('Stripe', 'stripe', 'Payment context alongside your orders.', 'stripe', 'available', 'outer', 4, 'published'),
  ('Razorpay', 'razorpay', 'Payment context alongside your orders.', 'razorpay', 'available', 'outer', 5, 'published'),
  ('Google Analytics', 'googleanalytics', 'Acquisition context for first-time buyers.', 'googleanalytics', 'available', 'outer', 6, 'published'),
  ('Google Sheets', 'googlesheets', 'Export destination for any report.', 'googlesheets', 'available', 'outer', 7, 'published'),
  ('Shopify', 'shopify', 'The engine reads a normalised snapshot, so a second platform is an adapter rather than a rewrite. That adapter does not exist today.', 'shopify', 'planned', 'outer', 8, 'published')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Navigation — header mega menu
-- ---------------------------------------------------------------------------

with groups as (
  insert into public.navigation (location, label, blurb, position, status)
  values
    ('header', 'Analyse', 'Understand who is buying, and who has stopped.', 0, 'published'),
    ('header', 'Act', 'Reach them without leaving the screen.', 1, 'published'),
    ('header', 'WhatsApp', 'The half your customer actually sees.', 2, 'published')
  returning id, label
)
insert into public.navigation (location, parent_id, label, href, description, icon, position, status)
select 'header', g.id, v.label, v.href, v.description, v.icon, v.position, 'published'
from groups g
join (
  values
    ('Analyse', 'Customer intelligence', '/features#customers', 'RFM segments, lifetime value, churn risk', 'Users', 0),
    ('Analyse', 'Revenue & acquisition', '/features#revenue', 'Every KPI against the prior period', 'BarChart3', 1),
    ('Analyse', 'Cohorts & retention', '/features#revenue', 'Every acquisition month, followed forward', 'ChartColumnBig', 2),
    ('Analyse', 'Products & stock', '/features#products', 'ABC classes, days of cover, affinity', 'Boxes', 3),
    ('Act', 'Campaigns', '/features/campaigns', 'Audience, personalisation, coupons', 'Megaphone', 0),
    ('Act', 'AI commerce agent', '/features/ai', 'Proposes; you approve', 'Sparkles', 1),
    ('Act', 'Automated flows', '/features#flows', 'Sequences that stop when they buy', 'Workflow', 2),
    ('Act', 'Audience builder', '/features/campaigns#audience', 'A filter, not a list you maintain', 'Bot', 3),
    ('WhatsApp', 'How it arrives', '/whatsapp', 'Ten templates, personalised per person', 'MessageCircle', 0),
    ('WhatsApp', 'Auto-reply menu', '/whatsapp#auto-reply', 'Answers at 3am, fetches a person', 'Clock', 1),
    ('WhatsApp', 'Shared inbox', '/whatsapp#inbox', 'Every reply, with their history', 'Inbox', 2),
    ('WhatsApp', 'API reference', '/api-docs', 'OpenAPI schema, browsable', 'Code2', 3)
) as v(group_label, label, href, description, icon, position)
  on v.group_label = g.label;

-- Top-level header links, alongside the Product mega menu.
insert into public.navigation (location, label, href, position, status)
values
  ('header', 'Features', '/features', 10, 'published'),
  ('header', 'Integrations', '/integrations', 11, 'published'),
  ('header', 'Pricing', '/pricing', 12, 'published')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Footer
-- ---------------------------------------------------------------------------

insert into public.footer_links (column_label, label, href, position, status)
values
  ('Product', 'Features', '/features', 0, 'published'),
  ('Product', 'Campaigns', '/features/campaigns', 1, 'published'),
  ('Product', 'AI assistant', '/features/ai', 2, 'published'),
  ('Product', 'WhatsApp', '/whatsapp', 3, 'published'),
  ('Product', 'Integrations', '/integrations', 4, 'published'),
  ('Product', 'Pricing', '/pricing', 5, 'published'),
  ('Product', 'API reference', '/api-docs', 6, 'published'),
  ('Platform', 'WooCommerce', '/integrations', 0, 'published'),
  ('Platform', 'Shopify — soon', '/integrations#shopify', 1, 'published'),
  ('Platform', 'Your own WhatsApp host', '/pricing#delivery', 2, 'published'),
  ('Platform', 'WhatsApp Cloud API', '/pricing#delivery', 3, 'published'),
  ('Platform', 'Webhooks', '/api-docs', 4, 'published'),
  ('Start', 'Get started', '/connect', 0, 'published'),
  ('Start', 'Log in', '/login', 1, 'published'),
  ('Start', 'Open the app', '/dashboard', 2, 'published'),
  ('Start', 'FAQ', '/pricing#faq', 3, 'published')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- SEO
-- ---------------------------------------------------------------------------

insert into public.seo_entries (
  route, title, description, keywords, sitemap_priority, sitemap_changefreq, position, status
)
values
  (
    '/',
    'PulseCommerce — AI Commerce Intelligence for WooCommerce',
    'PulseCommerce turns your WooCommerce orders into revenue analytics, RFM segments, predicted lifetime value, churn risk, cohort retention and forecasts — then reaches those customers on WhatsApp from the same screen.',
    array['WooCommerce analytics', 'commerce intelligence', 'RFM segmentation', 'customer lifetime value', 'churn prediction', 'cohort analysis', 'revenue forecasting', 'WhatsApp marketing', 'ecommerce business intelligence'],
    1.0, 'weekly', 0, 'published'
  ),
  ('/features', 'Features', 'Thirteen modules: RFM segmentation, predicted lifetime value, cohort retention, acquisition channels, ABC product classes, days of cover, WhatsApp campaigns, automated flows and an assistant that proposes.', '{}', 0.9, 'monthly', 1, 'published'),
  ('/features/campaigns', 'Campaigns', 'Build an audience from your real analytics, personalise every message from that customer''s own history, dry-run the list, and send on WhatsApp through a gateway you own.', '{}', 0.8, 'monthly', 2, 'published'),
  ('/features/ai', 'AI assistant', 'Ask about your store in plain English. The assistant reads your real figures, drafts the message, and stops — nothing sends until you approve it. Phone numbers are never in its scope.', '{}', 0.8, 'monthly', 3, 'published'),
  ('/whatsapp', 'WhatsApp', 'Campaigns personalised from each customer''s own history, automated flows that stop when they buy, an out-of-hours menu that knows when to fetch a person, and one shared inbox — through a gateway you own.', '{}', 0.8, 'monthly', 4, 'published'),
  ('/integrations', 'Integrations', 'WooCommerce over its own app-authorization flow, read-only. WhatsApp through your own host or the official Cloud API. Shopify next, as an adapter rather than a rewrite.', '{}', 0.7, 'monthly', 5, 'published'),
  ('/pricing', 'Pricing', 'One price for all thirteen modules. Choose how messages are carried: your own WhatsApp host with no per-message fee, or the official Cloud API with delivery backed by Meta.', '{}', 0.9, 'monthly', 6, 'published'),
  ('/api-docs', 'API reference', 'The documented REST API behind every screen, with a browsable OpenAPI schema.', '{}', 0.5, 'monthly', 7, 'published'),
  ('/connect', 'Connect your store', 'Approve read-only access inside your own WordPress admin. The first pull starts on its own.', '{}', 0.6, 'yearly', 8, 'published'),
  ('/login', 'Log in', 'Sign in to PulseCommerce.', '{}', 0.3, 'yearly', 9, 'published')
on conflict (route) do nothing;

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------

insert into public.settings (key, value, description, group_label, is_public)
values
  ('site.name', '"PulseCommerce"', 'Product name, shown in the header and metadata.', 'general', true),
  ('site.tagline', '"AI Commerce Intelligence Platform"', 'One-line positioning.', 'general', true),
  ('site.default_theme', '"system"', 'light | dark | system', 'appearance', true),
  ('landing.testimonials_note', '"Quotes below are illustrative placeholders while the first cohort of stores is onboarding — they are not attributed to real customers."', 'Shown above the testimonials section while the quotes are placeholders.', 'landing', true),
  ('landing.pricing_note', '"Fourteen days free on every paid tier. No card until you have seen your own data."', 'Shown under the pricing tiers.', 'landing', true)
on conflict (key) do nothing;
