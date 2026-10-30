-- Walking connections are explicit, physically checked segments between published pins.
-- No synthetic paths, approximate coordinates, or unreviewed distances are seeded.
create table if not exists public.veritashub_campus_walking_edges (
 id uuid primary key default gen_random_uuid(),
 from_location_id uuid not null references public.veritashub_verified_campus_locations(id) on delete restrict,
 to_location_id uuid not null references public.veritashub_verified_campus_locations(id) on delete restrict,
 distance_m integer not null check (distance_m between 1 and 20000),
 estimated_minutes integer not null check (estimated_minutes between 1 and 240),
 accessible boolean not null default false,
 path_note text not null check (char_length(trim(path_note)) between 10 and 1000),
 verified_by text not null check (char_length(trim(verified_by)) between 3 and 160),
 verification_source text not null check (char_length(trim(verification_source)) between 10 and 500),
 verified_at timestamptz not null,
 published boolean not null default false,
 created_at timestamptz not null default now(),
 constraint veritashub_walking_edges_distinct check (from_location_id <> to_location_id),
 constraint veritashub_walking_edges_ordered check (from_location_id < to_location_id),
 unique (from_location_id,to_location_id)
);
create index if not exists veritashub_walking_edges_published_idx
 on public.veritashub_campus_walking_edges(published);
alter table public.veritashub_campus_walking_edges enable row level security;
revoke all on public.veritashub_campus_walking_edges from public,anon,authenticated;
grant select on public.veritashub_campus_walking_edges to anon,authenticated;
create policy "veritashub_walking_edges_published_and_endpoints"
 on public.veritashub_campus_walking_edges for select to anon,authenticated
 using (published=true and
 exists (select 1 from public.veritashub_verified_campus_locations a
  where a.id=from_location_id and a.published=true) and
 exists (select 1 from public.veritashub_verified_campus_locations b
  where b.id=to_location_id and b.published=true));
-- A route edge represents a bidirectional verified walking connection.
-- Its distance must be physically checked, not inferred from a straight line.
-- Approval and publishing are privileged administration operations, not client grants.
