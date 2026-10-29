-- Veritas Hub: privacy-conscious shared visitor counter
-- Run this once in Supabase SQL Editor. It does not modify forum or shared_content tables.
-- Counts unique browser profiles and total page loads from the time this feature is enabled.
-- It does not collect names, emails, IP addresses, or precise locations.

create table if not exists public.site_analytics_visitors (
  visitor_key text primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  visit_count bigint not null default 1 check (visit_count >= 1)
);

alter table public.site_analytics_visitors enable row level security;

-- The table is private to the database; the public website can only use the RPC below.
revoke all on table public.site_analytics_visitors from anon, authenticated, public;

create or replace function public.record_site_visit(p_visitor_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  visitor_key_clean text;
  visitors_total bigint;
  visits_total bigint;
begin
  visitor_key_clean := lower(trim(coalesce(p_visitor_key, '')));

  -- Only accept UUID-shaped random browser IDs and reject arbitrary long strings.
  if length(visitor_key_clean) <> 36
     or visitor_key_clean !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Invalid visitor key';
  end if;

  insert into public.site_analytics_visitors(visitor_key, first_seen, last_seen, visit_count)
  values (visitor_key_clean, now(), now(), 1)
  on conflict (visitor_key) do update
    set last_seen = now(),
        visit_count = public.site_analytics_visitors.visit_count + 1;

  select count(*), coalesce(sum(visit_count), 0)
    into visitors_total, visits_total
    from public.site_analytics_visitors;

  return jsonb_build_object(
    'unique_visitors', visitors_total,
    'total_visits', visits_total
  );
end;
$$;

revoke all on function public.record_site_visit(text) from public;
grant execute on function public.record_site_visit(text) to anon, authenticated;
