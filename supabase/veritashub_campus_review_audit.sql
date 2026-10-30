-- Administrative review must occur through trusted project administration only.
-- This migration does not expose any browser-accessible approval RPC.
alter table public.veritashub_campus_location_submissions
 add column if not exists reviewed_by uuid references auth.users(id),
 add column if not exists approved_location_id uuid
   references public.veritashub_verified_campus_locations(id);
alter table public.veritashub_campus_location_submissions
 add constraint veritashub_campus_review_attribution check (
   (status='pending' and reviewed_by is null and approved_location_id is null)
   or (status='rejected' and reviewed_by is not null and approved_location_id is null)
   or (status='approved' and reviewed_by is not null and approved_location_id is not null)
 );
create table if not exists public.veritashub_campus_review_events (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.veritashub_campus_location_submissions(id)
   on delete restrict,
 reviewer_id uuid not null references auth.users(id) on delete restrict,
 decision text not null check (decision in ('approved','rejected')),
 decision_note text not null check (char_length(trim(decision_note)) between 10 and 1000),
 verified_location_id uuid references public.veritashub_verified_campus_locations(id),
 created_at timestamptz not null default now(),
 unique(submission_id),
 constraint veritashub_campus_review_event_consistency check (
   (decision='approved' and verified_location_id is not null)
   or (decision='rejected' and verified_location_id is null)
 )
);
alter table public.veritashub_campus_review_events enable row level security;
revoke all on public.veritashub_campus_review_events from public,anon,authenticated;
-- Review events are administrative-only; no client-facing grants or policies.
-- A privileged reviewer must independently verify evidence and record a
-- reviewed_by identity, decision note, and event in one database transaction.
