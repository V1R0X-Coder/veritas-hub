-- Campus verification intake: user-submitted suggestions never become public pins.
-- Review is deliberately performed by trusted administrators outside the browser.
create table if not exists public.veritashub_campus_location_submissions (
 id uuid primary key default gen_random_uuid(),
 submitted_by uuid not null references auth.users(id) on delete cascade,
 proposed_name text not null check (char_length(trim(proposed_name)) between 3 and 120),
 proposed_category text not null check (proposed_category in
   ('academic','services','residence','transport','recreation','other')),
 proposed_latitude double precision not null check (proposed_latitude between -90 and 90),
 proposed_longitude double precision not null check (proposed_longitude between -180 and 180),
 evidence_description text not null check (char_length(trim(evidence_description)) between 20 and 1000),
 campus_contact text not null check (char_length(trim(campus_contact)) between 3 and 160),
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 review_note text,
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 constraint veritashub_review_consistency check (
   (status = 'pending' and reviewed_at is null) or
   (status <> 'pending' and reviewed_at is not null and
    review_note is not null and char_length(trim(review_note)) >= 10))
);
create index if not exists veritashub_location_submissions_owner_idx
 on public.veritashub_campus_location_submissions(submitted_by,created_at desc);
alter table public.veritashub_campus_location_submissions enable row level security;
revoke all on public.veritashub_campus_location_submissions from public,anon,authenticated;
grant select,insert on public.veritashub_campus_location_submissions to authenticated;
create policy "veritashub_location_submissions_own_read"
 on public.veritashub_campus_location_submissions for select to authenticated
 using (submitted_by = (select auth.uid()));
create policy "veritashub_location_submissions_own_pending_insert"
 on public.veritashub_campus_location_submissions for insert to authenticated
 with check (submitted_by = (select auth.uid()) and status='pending'
   and reviewed_at is null and review_note is null);
-- No browser UPDATE or DELETE grants: submissions cannot self-approve.
-- Administrators verify evidence and separately publish approved points
-- to veritashub_verified_campus_locations using trusted project administration.
