-- Approved campus points only. No unverified coordinates are seeded.
create table if not exists public.veritashub_verified_campus_locations (
 id uuid primary key default gen_random_uuid(),
 name text not null unique check (char_length(trim(name)) between 3 and 120),
 category text not null check (category in ('academic','services','residence','transport','recreation','other')),
 latitude double precision not null check (latitude between -90 and 90),
 longitude double precision not null check (longitude between -180 and 180),
 accessibility_note text not null default '',
 verified_by text not null check (char_length(trim(verified_by)) between 3 and 160),
 verification_source text not null check (char_length(trim(verification_source)) between 10 and 500),
 verified_at timestamptz not null,
 published boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.veritashub_verified_campus_locations enable row level security;
revoke all on public.veritashub_verified_campus_locations from public,anon,authenticated;
grant select on public.veritashub_verified_campus_locations to anon,authenticated;
create policy "veritashub_verified_locations_public_read"
on public.veritashub_verified_campus_locations
for select to anon,authenticated using (published = true);
-- Publishing is a privileged administrative operation; browsers cannot insert,
-- update, delete or approve location data. Verify evidence outside this table
-- before adding a published row through trusted project administration.
