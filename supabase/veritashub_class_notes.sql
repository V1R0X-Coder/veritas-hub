-- Additive Veritas Hub text notes; no existing StudyLink tables are modified.
create table if not exists public.veritashub_class_notes (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.veritashub_classes(id) on delete cascade,
 lecturer_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 3 and 160),
 body text not null check (char_length(body) between 1 and 20000),
 published boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists veritashub_class_notes_class_idx on public.veritashub_class_notes(class_id,published);
alter table public.veritashub_class_notes enable row level security;
revoke all on public.veritashub_class_notes from anon, authenticated;
grant select,insert,update on public.veritashub_class_notes to authenticated;
create policy "veritashub_notes_read_assigned_or_enrolled" on public.veritashub_class_notes
 for select to authenticated using (
  (lecturer_id=(select auth.uid()) and exists (
   select 1 from public.veritashub_lecturer_classes lc
   join public.veritashub_lecturers l on l.user_id=lc.lecturer_id
   where lc.class_id=veritashub_class_notes.class_id and lc.lecturer_id=(select auth.uid()) and l.active=true))
  or (published=true and exists (
   select 1 from public.veritashub_class_enrollments e
   where e.class_id=veritashub_class_notes.class_id and e.user_id=(select auth.uid())))
 );
create policy "veritashub_notes_insert_assigned_lecturer" on public.veritashub_class_notes
 for insert to authenticated with check (
  lecturer_id=(select auth.uid()) and exists (
   select 1 from public.veritashub_lecturer_classes lc
   join public.veritashub_lecturers l on l.user_id=lc.lecturer_id
   where lc.class_id=veritashub_class_notes.class_id and lc.lecturer_id=(select auth.uid()) and l.active=true)
 );
create policy "veritashub_notes_update_assigned_lecturer" on public.veritashub_class_notes
 for update to authenticated
 using (lecturer_id=(select auth.uid()) and exists (
   select 1 from public.veritashub_lecturer_classes lc
   join public.veritashub_lecturers l on l.user_id=lc.lecturer_id
   where lc.class_id=veritashub_class_notes.class_id and lc.lecturer_id=(select auth.uid()) and l.active=true))
 with check (lecturer_id=(select auth.uid()) and exists (
   select 1 from public.veritashub_lecturer_classes lc
   join public.veritashub_lecturers l on l.user_id=lc.lecturer_id
   where lc.class_id=veritashub_class_notes.class_id and lc.lecturer_id=(select auth.uid()) and l.active=true));
