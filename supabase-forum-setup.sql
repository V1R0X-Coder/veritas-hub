-- Veritas Hub shared forum pilot schema.
-- Run this in Supabase Dashboard -> SQL Editor.
-- This starter allows public reading and posting, but NOT public editing or deletion.
-- Before a public launch, add Supabase Auth, rate limiting, moderation/reporting and stricter access rules.

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'Student' check (char_length(display_name) between 1 and 40),
  category text not null check (char_length(category) between 1 and 80),
  title text not null check (char_length(title) between 1 and 100),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  display_name text not null default 'Student' check (char_length(display_name) between 1 and 40),
  body text not null check (char_length(body) between 1 and 600),
  created_at timestamptz not null default now()
);

create index if not exists forum_posts_created_at_idx on public.forum_posts (created_at desc);
create index if not exists forum_replies_post_id_created_at_idx on public.forum_replies (post_id, created_at asc);

alter table public.forum_posts enable row level security;
alter table public.forum_replies enable row level security;

grant select, insert on public.forum_posts to anon, authenticated;
grant select, insert on public.forum_replies to anon, authenticated;

drop policy if exists "Anyone can read forum posts" on public.forum_posts;
create policy "Anyone can read forum posts" on public.forum_posts for select to anon, authenticated using (true);
drop policy if exists "Anyone can create forum posts" on public.forum_posts;
create policy "Anyone can create forum posts" on public.forum_posts for insert to anon, authenticated with check (true);

drop policy if exists "Anyone can read forum replies" on public.forum_replies;
create policy "Anyone can read forum replies" on public.forum_replies for select to anon, authenticated using (true);
drop policy if exists "Anyone can create forum replies" on public.forum_replies;
create policy "Anyone can create forum replies" on public.forum_replies for insert to anon, authenticated with check (true);

-- Shared content for marketplace, lost & found, study resources, classroom links and Q&A.
-- Public pilot only: anonymous users can read and create records. Add Auth, moderation,
-- abuse controls and stricter policies before a campus-wide launch.
create table if not exists public.shared_content (
  id uuid primary key default gen_random_uuid(),
  feature text not null check (feature in ('marketplace','lost','resources','classroom','vendors','food')),
  kind text not null check (char_length(kind) between 1 and 40),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
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
    feature in ('marketplace','lost','resources','classroom','vendors','food')
    and jsonb_typeof(payload) = 'object'
  );

-- Shared item photos. Public read and anonymous upload are enabled for the pilot only.
-- The website limits images to 2 MB and supported image formats.
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
