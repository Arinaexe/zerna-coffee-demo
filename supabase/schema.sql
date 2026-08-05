-- Run this once in Supabase: SQL Editor > New query.
create table if not exists public.site_content (
  id text primary key default 'main',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

create policy "Anyone can read published content"
  on public.site_content for select
  using (true);

create policy "Signed-in editors can change content"
  on public.site_content for all
  to authenticated
  using (true)
  with check (true);

-- Create your editor in Authentication > Users. Do not enable public sign-ups.
