-- CMS content.
--
-- Every table here backs a section of the public marketing site. Two rules
-- hold across all of them, applied by public.apply_content_rls() rather than
-- written out eighteen times:
--
--   * anon and authenticated may SELECT rows whose status is 'published'
--   * editor and above may do anything
--
-- Writing the policy set once means a table added later cannot accidentally
-- ship with drafts readable by the public, which is the failure mode that
-- matters — a draft price or an unreleased announcement leaking is worse than
-- the section being briefly absent.
--
-- `position` orders rows within a section. It is a plain integer with a
-- unique-per-section index rather than a fractional rank: these lists are tens
-- of rows edited by hand, not thousands reordered by drag, so the simpler
-- thing is the right one.

-- ---------------------------------------------------------------------------
-- Shared RLS shape
-- ---------------------------------------------------------------------------

create or replace function public.apply_content_rls(target regclass)
returns void
language plpgsql
as $$
declare
  name text := replace(target::text, 'public.', '');
begin
  execute format('alter table %s enable row level security', target);

  execute format(
    'create policy %I on %s for select to anon, authenticated
       using (status = ''published'')',
    name || '_select_published', target
  );

  execute format(
    'create policy %I on %s for select to authenticated
       using (public.is_staff())',
    name || '_select_staff', target
  );

  execute format(
    'create policy %I on %s for all to authenticated
       using (public.has_min_role(''editor''))
       with check (public.has_min_role(''editor''))',
    name || '_write_editor', target
  );
end;
$$;

comment on function public.apply_content_rls is
  'Applies the standard content policy set: public reads published rows, '
  'staff read everything, editors and above write.';

-- Columns every content table carries.
create or replace function public.add_content_columns(target regclass)
returns void
language plpgsql
as $$
begin
  execute format(
    'alter table %s
       add column status public.content_status not null default ''draft'',
       add column position integer not null default 0,
       add column created_by uuid references public.users (id) on delete set null,
       add column updated_by uuid references public.users (id) on delete set null,
       add column created_at timestamptz not null default now(),
       add column updated_at timestamptz not null default now()',
    target
  );
  perform public.attach_updated_at(target);
  execute format('create index on %s (status, position)', target);
end;
$$;

-- ---------------------------------------------------------------------------
-- Landing settings — one row, the switches that are not per-section
-- ---------------------------------------------------------------------------

create table public.landing_settings (
  id uuid primary key default gen_random_uuid(),
  -- Enforces the singleton: only one row can hold `true`.
  is_active boolean not null default true,
  show_announcement boolean not null default true,
  show_testimonials boolean not null default true,
  show_partners boolean not null default true,
  show_pricing boolean not null default true,
  primary_cta_label text not null default 'Connect your store',
  primary_cta_href text not null default '/connect',
  secondary_cta_label text,
  secondary_cta_href text
);

select public.add_content_columns('public.landing_settings');
create unique index landing_settings_singleton on public.landing_settings (is_active)
  where is_active;
select public.apply_content_rls('public.landing_settings');

-- ---------------------------------------------------------------------------
-- Hero
-- ---------------------------------------------------------------------------

create table public.hero_sections (
  id uuid primary key default gen_random_uuid(),
  -- Which page this hero belongs to: '/' , '/features', '/pricing', ...
  route text not null,
  eyebrow text,
  headline text not null,
  -- The words carrying the gradient, rendered by AuroraText on the client.
  headline_accent text,
  headline_after text,
  subheadline text,
  primary_cta_label text,
  primary_cta_href text,
  secondary_cta_label text,
  secondary_cta_href text,
  -- Short reassurance chips under the buttons.
  trust_points text[] not null default '{}'
);

select public.add_content_columns('public.hero_sections');
create unique index hero_sections_route_key on public.hero_sections (route)
  where status = 'published';
select public.apply_content_rls('public.hero_sections');

-- ---------------------------------------------------------------------------
-- Features and modules
-- ---------------------------------------------------------------------------

create table public.features (
  id uuid primary key default gen_random_uuid(),
  -- Groups features into the section that renders them.
  collection text not null default 'modules',
  title text not null,
  description text not null,
  -- A lucide icon name, resolved to a component by an allow-listed map on the
  -- client. Storing the name rather than markup keeps arbitrary SVG out of the
  -- database and therefore out of the page.
  icon text,
  href text,
  cta_label text,
  -- Optional figure shown on the card, e.g. 10 "segments".
  metric numeric,
  metric_unit text
);

select public.add_content_columns('public.features');
create index features_collection_idx on public.features (collection, status, position);
select public.apply_content_rls('public.features');

create table public.analytics_modules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null,
  icon text,
  is_included boolean not null default true
);

select public.add_content_columns('public.analytics_modules');
select public.apply_content_rls('public.analytics_modules');

-- ---------------------------------------------------------------------------
-- Pricing
-- ---------------------------------------------------------------------------

create table public.pricing_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  blurb text,
  -- Stored as an amount plus a currency, not a formatted string: the page
  -- formats it, and a string here could not be compared, summed or localised.
  -- NULL means "not a number" — the free and self-hosted tiers.
  amount numeric(12, 2),
  currency text not null default 'INR',
  cadence text not null default 'per month',
  -- Shown instead of a formatted amount when `amount` is null.
  price_label text,
  is_highlighted boolean not null default false,
  cta_label text not null default 'Start free',
  cta_href text not null default '/connect',
  limits text[] not null default '{}'
);

select public.add_content_columns('public.pricing_plans');
create unique index pricing_plans_one_highlight on public.pricing_plans (is_highlighted)
  where is_highlighted and status = 'published';
select public.apply_content_rls('public.pricing_plans');

-- ---------------------------------------------------------------------------
-- FAQs, testimonials, partners
-- ---------------------------------------------------------------------------

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  -- Whether this one also appears in the shorter list on the landing page.
  show_on_landing boolean not null default true,
  category text
);

select public.add_content_columns('public.faqs');
select public.apply_content_rls('public.faqs');

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  -- Attribution is by role and context. `author_name` and `company` exist for
  -- when real, permitted quotes replace the placeholders, and are nullable
  -- precisely so an unattributed placeholder cannot masquerade as a real one.
  author_role text not null,
  author_context text,
  author_name text,
  company text,
  avatar_media_id uuid,
  rating smallint check (rating between 1 and 5),
  -- False until someone confirms the quote is real and permitted to publish.
  is_verified boolean not null default false
);

select public.add_content_columns('public.testimonials');
select public.apply_content_rls('public.testimonials');

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- A simple-icons slug, resolved client-side. Same reasoning as `features.icon`.
  icon_slug text,
  logo_media_id uuid,
  href text,
  -- 'stack' for the works-with band, 'customer' for a real logo wall.
  category text not null default 'stack'
);

select public.add_content_columns('public.partners');
select public.apply_content_rls('public.partners');

-- ---------------------------------------------------------------------------
-- Navigation and footer
-- ---------------------------------------------------------------------------

create table public.navigation (
  id uuid primary key default gen_random_uuid(),
  -- 'header' drives the mega menu, 'footer' the footer columns.
  location text not null default 'header',
  parent_id uuid references public.navigation (id) on delete cascade,
  label text not null,
  href text,
  description text,
  icon text,
  -- Shown on the parent group in the mobile drawer.
  blurb text,
  opens_in_new_tab boolean not null default false
);

select public.add_content_columns('public.navigation');
create index navigation_tree_idx on public.navigation (location, parent_id, position);
select public.apply_content_rls('public.navigation');

create table public.footer_links (
  id uuid primary key default gen_random_uuid(),
  column_label text not null,
  label text not null,
  href text not null,
  opens_in_new_tab boolean not null default false
);

select public.add_content_columns('public.footer_links');
create index footer_links_column_idx on public.footer_links (column_label, position);
select public.apply_content_rls('public.footer_links');

-- ---------------------------------------------------------------------------
-- Announcements and popups
-- ---------------------------------------------------------------------------

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  badge_label text,
  href text,
  link_label text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_dismissible boolean not null default true,
  constraint announcements_window check (ends_at is null or starts_at is null or ends_at > starts_at)
);

select public.add_content_columns('public.announcements');
select public.apply_content_rls('public.announcements');

create table public.popups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_media_id uuid,
  cta_label text,
  cta_href text,
  -- Seconds on page, or scroll percentage, before it shows.
  trigger_type text not null default 'delay',
  trigger_value integer not null default 8,
  -- Days before a dismissed popup may reappear for the same visitor.
  suppress_days integer not null default 30,
  starts_at timestamptz,
  ends_at timestamptz
);

select public.add_content_columns('public.popups');
select public.apply_content_rls('public.popups');

-- ---------------------------------------------------------------------------
-- Company and integrations
-- ---------------------------------------------------------------------------

create table public.company (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'PulseCommerce',
  tagline text,
  description text,
  legal_name text,
  email text,
  phone text,
  address text,
  logo_media_id uuid,
  logo_dark_media_id uuid,
  favicon_media_id uuid,
  -- [{ "label": "GitHub", "href": "...", "icon": "github" }, ...]
  social_links jsonb not null default '[]'::jsonb,
  copyright_notice text
);

select public.add_content_columns('public.company');
select public.apply_content_rls('public.company');

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon_slug text,
  logo_media_id uuid,
  href text,
  -- 'available' | 'planned' | 'beta'. Rendered at equal visual weight, so a
  -- planned integration is never mistaken for a shipped one.
  availability text not null default 'available',
  -- 'inner' and 'outer' place it on the orbit diagram.
  ring text not null default 'inner'
);

select public.add_content_columns('public.integrations');
select public.apply_content_rls('public.integrations');

-- ---------------------------------------------------------------------------
-- Pages, blog, release notes
-- ---------------------------------------------------------------------------

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  -- Markdown. Rendered with the app's existing react-markdown pipeline.
  body text,
  -- 'page' | 'documentation'
  kind text not null default 'page',
  parent_slug text,
  published_at timestamptz
);

select public.add_content_columns('public.pages');
create index pages_kind_idx on public.pages (kind, status, position);
select public.apply_content_rls('public.pages');

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text,
  cover_media_id uuid,
  author_id uuid references public.users (id) on delete set null,
  tags text[] not null default '{}',
  reading_minutes integer,
  published_at timestamptz
);

select public.add_content_columns('public.blog_posts');
create index blog_posts_published_idx on public.blog_posts (status, published_at desc);
select public.apply_content_rls('public.blog_posts');

create table public.release_notes (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text not null,
  body text,
  -- 'added' | 'changed' | 'fixed' | 'removed'
  category text not null default 'added',
  released_at date not null default current_date
);

select public.add_content_columns('public.release_notes');
create index release_notes_released_idx on public.release_notes (released_at desc);
select public.apply_content_rls('public.release_notes');

-- ---------------------------------------------------------------------------
-- SEO
--
-- One row per route. The landing page's JSON-LD is generated from the same
-- content tables the page renders, so structured data cannot disagree with the
-- visible page; this table carries the parts that are not derivable from
-- content — titles, canonicals, robots directives, social images.
-- ---------------------------------------------------------------------------

create table public.seo_entries (
  id uuid primary key default gen_random_uuid(),
  route text not null unique,
  title text,
  description text,
  keywords text[] not null default '{}',
  canonical_url text,
  og_title text,
  og_description text,
  og_image_media_id uuid,
  twitter_card text not null default 'summary_large_image',
  twitter_title text,
  twitter_description text,
  twitter_image_media_id uuid,
  robots_index boolean not null default true,
  robots_follow boolean not null default true,
  -- Extra JSON-LD merged into the generated @graph for this route.
  structured_data jsonb,
  -- 0.0–1.0 and a changefreq string, for the generated sitemap.
  sitemap_priority numeric(2, 1) not null default 0.5
    check (sitemap_priority >= 0 and sitemap_priority <= 1),
  sitemap_changefreq text not null default 'monthly',
  include_in_sitemap boolean not null default true
);

select public.add_content_columns('public.seo_entries');
select public.apply_content_rls('public.seo_entries');
