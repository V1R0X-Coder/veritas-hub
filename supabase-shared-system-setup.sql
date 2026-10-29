-- Veritas Hub shared-data migration. Run this AFTER the original forum setup.
-- Pilot scope: public read/insert only. Add authentication, ownership and moderation before launch.
-- This script is safe to rerun; it also upgrades existing tables to allow shared website feedback.
create table if not exists public.shared_content (
  id uuid primary key default gen_random_uuid(),
  feature text not null check (feature in ('marketplace','lost','resources','classroom','vendors','food','feedback')),
  kind text not null check (char_length(kind) between 1 and 40),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.shared_content drop constraint if exists shared_content_feature_check;
alter table public.shared_content add constraint shared_content_feature_check
  check (feature in ('marketplace','lost','resources','classroom','vendors','food','feedback'));

create index if not exists shared_content_feature_kind_created_idx
  on public.shared_content (feature, kind, created_at desc);
alter table public.shared_content enable row level security;
grant select, insert on public.shared_content to anon, authenticated;
drop policy if exists "Public can read shared content" on public.shared_content;
create policy "Public can read shared content" on public.shared_content
  for select to anon, authenticated using (true);
drop policy if exists "Public can create shared content" on public.shared_content;
create policy "Public can create shared content" on public.shared_content
  for insert to anon, authenticated with check (
    feature in ('marketplace','lost','resources','classroom','vendors','food','feedback')
    and jsonb_typeof(payload) = 'object'
  );

-- Shared item photos. Public read and anonymous upload are enabled for the pilot only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('veritas-media', 'veritas-media', true, 2097152,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];
drop policy if exists "Public can upload Veritas Hub pilot images" on storage.objects;
create policy "Public can upload Veritas Hub pilot images" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'veritas-media');
drop policy if exists "Public can read Veritas Hub pilot images" on storage.objects;
create policy "Public can read Veritas Hub pilot images" on storage.objects
  for select to anon, authenticated using (bucket_id = 'veritas-media');
