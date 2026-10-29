-- Veritas Hub: isolated academic class catalog and student enrollment.
-- Class creation and lecturer assignment remain administrator-controlled.
create table if not exists public.veritashub_classes (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(title) between 3 and 160),
 subject_code text not null check (length(subject_code) between 2 and 30),
 programme text not null check (length(programme) between 2 and 80),
 academic_level text not null check (length(academic_level) between 1 and 40),
 department text not null default '' check (length(department)<=120),
 description text not null default '' check (length(description)<=1000),
 is_published boolean not null default false,
 created_at timestamptz not null default now(),
 unique (subject_code,programme,academic_level,department)
);
create table if not exists public.veritashub_class_enrollments (
 user_id uuid not null references auth.users(id) on delete cascade,
 class_id uuid not null references public.veritashub_classes(id) on delete cascade,
 enrolled_at timestamptz not null default now(),
 primary key (user_id,class_id)
);
create index if not exists veritashub_enrollments_class_idx on public.veritashub_class_enrollments(class_id);
alter table public.veritashub_classes enable row level security;
alter table public.veritashub_class_enrollments enable row level security;
revoke all on public.veritashub_classes from anon,authenticated;
revoke all on public.veritashub_class_enrollments from anon,authenticated;
grant select on public.veritashub_classes to authenticated;
grant select,insert,delete on public.veritashub_class_enrollments to authenticated;
create policy "veritashub_read_published_classes" on public.veritashub_classes for select to authenticated using (is_published=true);
create policy "veritashub_read_own_enrollments" on public.veritashub_class_enrollments for select to authenticated using (user_id=(select auth.uid()));
create policy "veritashub_join_published_class" on public.veritashub_class_enrollments for insert to authenticated with check (
 user_id=(select auth.uid()) and exists (
 select 1 from public.veritashub_classes c where c.id=class_id and c.is_published=true
 ));
create policy "veritashub_leave_own_class" on public.veritashub_class_enrollments for delete to authenticated using (user_id=(select auth.uid()));