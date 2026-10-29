-- Private Sticky Notes sync for Veritas Hub.
-- Run this in Supabase SQL Editor AFTER the existing forum/shared-system setup.
-- Notes are readable only by their signed-in owner. Photo storage is private.

create table if not exists public.private_note (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null default '',
  photo_path text,
  created_at timestamptz not null default now(),
  constraint private_note_body_or_photo check (char_length(body) <= 3000)
);

create index if not exists private_note_owner_created_idx
  on public.private_note (owner_id, created_at desc);

alter table public.private_note enable row level security;
grant select, insert, delete on public.private_note to authenticated;
revoke all on public.private_note from anon;

drop policy if exists "Users can read their own private note rows" on public.private_note;
create policy "Users can read their own private note rows" on public.private_note
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists "Users can create their own private note rows" on public.private_note;
create policy "Users can create their own private note rows" on public.private_note
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "Users can delete their own private note rows" on public.private_note;
create policy "Users can delete their own private note rows" on public.private_note
  for delete to authenticated using (owner_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('private-note-photos', 'private-note-photos', false, 2097152,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Users can upload their own private note photos" on storage.objects;
create policy "Users can upload their own private note photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'private-note-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can read their own private note photos" on storage.objects;
create policy "Users can read their own private note photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'private-note-photos' and (storage.foldername(name))[1] = auth.uid()::text);
