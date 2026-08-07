-- Platform: media library, key/value settings, API keys.

-- ---------------------------------------------------------------------------
-- Media
--
-- Rows here are metadata; the bytes live in Supabase Storage. The pair is kept
-- consistent by deleting the row only through the service layer, which removes
-- the object first — a storage object with no row is invisible but harmless,
-- whereas a row with no object renders as a broken image on the public site.
-- ---------------------------------------------------------------------------

create table public.media (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'media',
  -- Path within the bucket. Unique per bucket so an upload cannot silently
  -- overwrite an asset another page is already using.
  path text not null,
  filename text not null,
  mime_type text not null,
  kind public.media_kind not null,
  size_bytes bigint not null,
  width integer,
  height integer,
  duration_seconds numeric(10, 2),
  -- Empty string is a valid, meaningful value: it marks an image as decorative
  -- so a screen reader skips it. NULL means nobody has decided yet.
  alt_text text,
  caption text,
  -- Small base64 placeholder for next/image blur-up, when one was generated.
  blur_data_url text,
  uploaded_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, path)
);

create index media_kind_idx on public.media (kind, created_at desc);
create index media_uploaded_by_idx on public.media (uploaded_by);

select public.attach_updated_at('public.media');

alter table public.media enable row level security;

-- Anyone may read metadata: these assets are served on a public marketing
-- site, so the filename and dimensions are public the moment the page renders.
create policy media_select_public on public.media
  for select to anon, authenticated using (true);

create policy media_write_editor on public.media
  for all to authenticated
  using (public.has_min_role('editor'))
  with check (public.has_min_role('editor'));

-- Now that media exists, wire up the references the content tables declared.
alter table public.testimonials
  add constraint testimonials_avatar_fk
  foreign key (avatar_media_id) references public.media (id) on delete set null;

alter table public.partners
  add constraint partners_logo_fk
  foreign key (logo_media_id) references public.media (id) on delete set null;

alter table public.popups
  add constraint popups_image_fk
  foreign key (image_media_id) references public.media (id) on delete set null;

alter table public.company
  add constraint company_logo_fk
  foreign key (logo_media_id) references public.media (id) on delete set null,
  add constraint company_logo_dark_fk
  foreign key (logo_dark_media_id) references public.media (id) on delete set null,
  add constraint company_favicon_fk
  foreign key (favicon_media_id) references public.media (id) on delete set null;

alter table public.integrations
  add constraint integrations_logo_fk
  foreign key (logo_media_id) references public.media (id) on delete set null;

alter table public.blog_posts
  add constraint blog_posts_cover_fk
  foreign key (cover_media_id) references public.media (id) on delete set null;

alter table public.seo_entries
  add constraint seo_entries_og_image_fk
  foreign key (og_image_media_id) references public.media (id) on delete set null,
  add constraint seo_entries_twitter_image_fk
  foreign key (twitter_image_media_id) references public.media (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Storage bucket
--
-- Public-read because every asset it holds is destined for a public marketing
-- page; making it private would mean signing a URL for each logo on every
-- render, which is cost and latency for no privacy gain.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  52428800, -- 50 MB, enough for a short product video
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/svg+xml', 'image/gif',
    'video/mp4', 'video/webm',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

create policy media_objects_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

create policy media_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.has_min_role('editor'));

create policy media_objects_update on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.has_min_role('editor'))
  with check (bucket_id = 'media' and public.has_min_role('editor'));

create policy media_objects_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.has_min_role('editor'));

-- ---------------------------------------------------------------------------
-- Settings
--
-- Typed key/value rather than a wide singleton row: a new setting is an insert
-- rather than a migration, and `is_public` decides in one place whether a
-- value may reach the browser. Anything holding a secret stays private and is
-- only ever read server-side.
-- ---------------------------------------------------------------------------

create table public.settings (
  key text primary key,
  value jsonb not null,
  description text,
  group_label text not null default 'general',
  is_public boolean not null default false,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select public.attach_updated_at('public.settings');

alter table public.settings enable row level security;

create policy settings_select_public on public.settings
  for select to anon, authenticated using (is_public);

create policy settings_select_staff on public.settings
  for select to authenticated using (public.is_staff());

create policy settings_write_admin on public.settings
  for all to authenticated
  using (public.has_min_role('admin'))
  with check (public.has_min_role('admin'));

-- ---------------------------------------------------------------------------
-- API keys
--
-- Only a hash is stored. The plaintext key is shown once, at creation, and is
-- unrecoverable afterwards — which is the whole point: a table of API keys
-- that can be read back is a table that leaks every integration at once if it
-- is ever exfiltrated.
-- ---------------------------------------------------------------------------

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- SHA-256 of the key, hex encoded.
  key_hash text not null unique,
  -- First few characters, so a key can be recognised in a list.
  key_prefix text not null,
  scopes text[] not null default '{}',
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index api_keys_active_idx on public.api_keys (revoked_at) where revoked_at is null;

select public.attach_updated_at('public.api_keys');

alter table public.api_keys enable row level security;

create policy api_keys_manage_admin on public.api_keys
  for all to authenticated
  using (public.has_min_role('admin'))
  with check (public.has_min_role('admin'));
