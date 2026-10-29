-- Veritas Hub: lecturer permissions are granted only by a trusted database administrator.
-- No browser user can assign or elevate their own role.
create table if not exists public.veritashub_lecturers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (length(display_name) between 1 and 120),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.veritashub_lecturer_classes (
 lecturer_id uuid not null references public.veritashub_lecturers(user_id) on delete cascade,
 class_id uuid not null references public.veritashub_classes(id) on delete cascade,
 assigned_at timestamptz not null default now(),
 primary key (lecturer_id,class_id)
);
create index if not exists veritashub_lecturer_classes_class_idx on public.veritashub_lecturer_classes(class_id);
alter table public.veritashub_lecturers enable row level security;
alter table public.veritashub_lecturer_classes enable row level security;
revoke all on public.veritashub_lecturers from anon,authenticated;
revoke all on public.veritashub_lecturer_classes from anon,authenticated;
grant select on public.veritashub_lecturers to authenticated;
grant select on public.veritashub_lecturer_classes to authenticated;
create policy "veritashub_lecturer_self_read" on public.veritashub_lecturers
 for select to authenticated using (user_id=(select auth.uid()));
create policy "veritashub_lecturer_own_assignments" on public.veritashub_lecturer_classes
 for select to authenticated using (
 lecturer_id=(select auth.uid())
 and exists (select 1 from public.veritashub_lecturers l
             where l.user_id=lecturer_id and l.active=true)
 );
-- Class catalog remains administrator-managed; lecturers do not receive automatic edit rights.
