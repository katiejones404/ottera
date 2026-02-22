create extension if not exists pgcrypto;

alter table public.nonprofits
  add column if not exists external_key text unique,
  add column if not exists description text,
  add column if not exists distribution_schedule text,
  add column if not exists photo_urls text[] not null default '{}',
  add column if not exists logo_url text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists approval_status text not null default 'approved',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text;

create table if not exists public.nonprofit_admin_usernames (
  nonprofit_id uuid not null references public.nonprofits(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  primary key (nonprofit_id, username)
);

create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  website text,
  description text not null,
  distribution_schedule text,
  contact_email text,
  contact_phone text,
  addresses jsonb not null default '[]'::jsonb,
  zip_codes text[] not null default '{}',
  focus_area text not null default 'miscellaneous',
  requested_admin_usernames text[] not null default '{}',
  status text not null default 'pending',
  nonprofit_id uuid references public.nonprofits(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.resource_listings (
  id uuid primary key default gen_random_uuid(),
  external_key text unique,
  title text not null,
  description text not null,
  category_slug text not null check (category_slug in ('closet', 'shelters', 'pantry')),
  listing_source text not null check (listing_source in ('individual', 'nonprofit')),
  nonprofit_id uuid references public.nonprofits(id) on delete set null,
  posted_by_username text,
  location_label text not null,
  zip_codes text[] not null default '{}',
  website text,
  contact_info jsonb not null default '{}'::jsonb,
  distribution_schedule text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists idx_resource_listings_category on public.resource_listings(category_slug);
create index if not exists idx_resource_listings_nonprofit on public.resource_listings(nonprofit_id);
create index if not exists idx_partner_apps_status on public.partner_applications(status);

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  location_label text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  zip_codes text[] not null default '{}',
  website text,
  status text not null default 'active',
  posted_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_community_events_status_start on public.community_events(status, start_at);
