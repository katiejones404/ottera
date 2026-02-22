alter table public.nonprofits
  add column if not exists photo_urls text[] not null default '{}',
  add column if not exists logo_url text;
