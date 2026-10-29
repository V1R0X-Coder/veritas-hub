-- Veritas Hub: fix shared website ratings/feedback rejected by RLS.
-- Run this in Supabase SQL Editor. It does not delete existing shared content.
alter table public.shared_content drop constraint if exists shared_content_feature_check;
alter table public.shared_content add constraint shared_content_feature_check
  check (feature in ('marketplace','lost','resources','classroom','vendors','food','feedback'));

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
