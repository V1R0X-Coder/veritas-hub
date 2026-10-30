-- Campus reviewers are provisioned exclusively by trusted database administrators.
create table if not exists public.veritashub_campus_reviewers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 appointed_at timestamptz not null default now(),
 appointed_by text not null check (char_length(trim(appointed_by)) between 3 and 160)
);
alter table public.veritashub_campus_reviewers enable row level security;
revoke all on public.veritashub_campus_reviewers from public,anon,authenticated;
-- Reviewers may inspect pending suggestions, but never other users' accounts.
create or replace function public.veritashub_campus_review_queue()
returns table (id uuid, proposed_name text, proposed_category text,
 proposed_latitude double precision, proposed_longitude double precision,
 evidence_description text, campus_contact text, created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists (
   select 1 from public.veritashub_campus_reviewers r where r.user_id=auth.uid()
 ) then raise exception 'Campus reviewer authorization required'; end if;
 return query select s.id,s.proposed_name,s.proposed_category,s.proposed_latitude,
  s.proposed_longitude,s.evidence_description,s.campus_contact,s.created_at
 from public.veritashub_campus_location_submissions s
 where s.status='pending' order by s.created_at asc limit 100;
end $$;
create or replace function public.veritashub_review_campus_location(
 p_submission_id uuid,p_decision text,p_note text,p_verification_source text,
 p_accessibility_note text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare v_reviewer uuid:=auth.uid();
 v_submission public.veritashub_campus_location_submissions%rowtype;
 v_location uuid;
begin
 if v_reviewer is null or not exists (
   select 1 from public.veritashub_campus_reviewers r where r.user_id=v_reviewer
 ) then raise exception 'Campus reviewer authorization required'; end if;
 if p_decision not in ('approved','rejected') or p_decision is null
   or char_length(trim(coalesce(p_note,''))) not between 10 and 1000
 then raise exception 'Invalid review decision or explanation'; end if;
 select * into v_submission from public.veritashub_campus_location_submissions
  where id=p_submission_id and status='pending' for update;
 if not found then raise exception 'Pending submission not found'; end if;
 if p_decision='approved' then
   if char_length(trim(coalesce(p_verification_source,''))) not between 10 and 500
   then raise exception 'Independent verification evidence is required'; end if;
   insert into public.veritashub_verified_campus_locations
    (name,category,latitude,longitude,accessibility_note,verified_by,
     verification_source,verified_at,published)
   values (v_submission.proposed_name,v_submission.proposed_category,
    v_submission.proposed_latitude,v_submission.proposed_longitude,
    coalesce(p_accessibility_note,''),v_reviewer::text,
    trim(p_verification_source),now(),false)
   returning id into v_location;
 end if;
 update public.veritashub_campus_location_submissions
  set status=p_decision,review_note=trim(p_note),reviewed_at=now(),
      reviewed_by=v_reviewer,approved_location_id=v_location
  where id=p_submission_id;
 insert into public.veritashub_campus_review_events
  (submission_id,reviewer_id,decision,decision_note,verified_location_id)
 values (p_submission_id,v_reviewer,p_decision,trim(p_note),v_location);
 return v_location;
end $$;
revoke all on function public.veritashub_campus_review_queue() from public,anon;
revoke all on function public.veritashub_review_campus_location(uuid,text,text,text,text) from public,anon;
grant execute on function public.veritashub_campus_review_queue() to authenticated;
grant execute on function public.veritashub_review_campus_location(uuid,text,text,text,text) to authenticated;
-- Approval creates an UNPUBLISHED verified point. Public map publication
-- remains a separate privileged administrative action after final QA.
