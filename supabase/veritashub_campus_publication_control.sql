-- Separate second-person publication approval from initial location review.
-- Only database-appointed publishers may run this transaction.
create table if not exists public.veritashub_campus_publishers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 appointed_by text not null check (char_length(trim(appointed_by)) between 3 and 160),
 appointed_at timestamptz not null default now()
);
alter table public.veritashub_campus_publishers enable row level security;
revoke all on public.veritashub_campus_publishers from public,anon,authenticated;

create table if not exists public.veritashub_campus_publication_events (
 id uuid primary key default gen_random_uuid(),
 location_id uuid not null references public.veritashub_verified_campus_locations(id) on delete restrict,
 publisher_id uuid not null references auth.users(id) on delete restrict,
 action text not null check (action in ('publish','unpublish')),
 reason text not null check (char_length(trim(reason)) between 10 and 1000),
 created_at timestamptz not null default now()
);
create index if not exists veritashub_campus_publication_events_location_idx
 on public.veritashub_campus_publication_events(location_id,created_at desc);
alter table public.veritashub_campus_publication_events enable row level security;
revoke all on public.veritashub_campus_publication_events from public,anon,authenticated;

create or replace function public.veritashub_set_campus_location_published(
 p_location_id uuid,p_publish boolean,p_reason text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_point public.veritashub_verified_campus_locations%rowtype;
 v_reviewer uuid;
begin
 if v_actor is null or not exists (
   select 1 from public.veritashub_campus_publishers where user_id=v_actor
 ) then raise exception 'Campus publisher authorization required'; end if;
 if p_publish is null or char_length(trim(coalesce(p_reason,''))) not between 10 and 1000
 then raise exception 'A valid publication decision and reason are required'; end if;
 select * into v_point from public.veritashub_verified_campus_locations
 where id=p_location_id for update;
 if not found then raise exception 'Verified location not found'; end if;
 if v_point.published=p_publish then raise exception 'Location already in requested publication state'; end if;
 if p_publish then
   select s.reviewed_by into v_reviewer
   from public.veritashub_campus_location_submissions s
   join public.veritashub_campus_review_events e
    on e.submission_id=s.id and e.decision='approved'
   where s.approved_location_id=p_location_id and s.status='approved'
   and s.reviewed_at is not null and s.reviewed_by=e.reviewer_id
   and e.verified_location_id=p_location_id;
   if v_reviewer is null then raise exception 'Approved review audit required before publication'; end if;
   if v_reviewer=v_actor then raise exception 'A second authorized person must publish this location'; end if;
 end if;
 update public.veritashub_verified_campus_locations set published=p_publish
 where id=p_location_id;
 insert into public.veritashub_campus_publication_events
 (location_id,publisher_id,action,reason)
 values (p_location_id,v_actor,case when p_publish then 'publish' else 'unpublish' end,trim(p_reason));
 return p_publish;
end $$;
revoke all on function public.veritashub_set_campus_location_published(uuid,boolean,text) from public,anon;
grant execute on function public.veritashub_set_campus_location_published(uuid,boolean,text) to authenticated;
-- Publisher accounts are appointed only by trusted database administration.
-- Never seed a reviewer/publisher identity or auto-publish an unverified point.
