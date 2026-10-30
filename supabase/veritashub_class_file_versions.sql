-- Additive foundation for immutable teaching-file version history.
-- This does not alter existing file records or change existing storage policies.
-- Apply only after a backup and test with lecturer/student accounts.
create table if not exists public.veritashub_class_file_versions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.veritashub_class_files(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  lecturer_id uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique check (char_length(storage_path) between 10 and 500),
  file_name text not null check (char_length(file_name) between 1 and 200),
  mime_type text not null check (mime_type in (
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation')),
  file_size bigint not null check (file_size between 1 and 10485760),
  created_at timestamptz not null default now(),
  unique(file_id,version_number)
);
create index if not exists veritashub_file_versions_lookup_idx
  on public.veritashub_class_file_versions(file_id,version_number desc);
alter table public.veritashub_class_file_versions enable row level security;
revoke all on public.veritashub_class_file_versions from anon,authenticated;
grant select on public.veritashub_class_file_versions to authenticated;

-- Metadata visible only to assigned active lecturers or enrolled students
-- with access to the corresponding published file.
create policy "veritashub_file_versions_author_or_enrolled"
on public.veritashub_class_file_versions for select to authenticated using (
  exists (
    select 1 from public.veritashub_class_files f
    where f.id=file_id and (
      (f.lecturer_id=(select auth.uid()) and exists (
        select 1 from public.veritashub_lecturer_classes lc
        join public.veritashub_lecturers l on l.user_id=lc.lecturer_id
        where lc.class_id=f.class_id and lc.lecturer_id=(select auth.uid()) and l.active
      ))
      or (f.published and exists (
        select 1 from public.veritashub_class_enrollments e
        where e.class_id=f.class_id and e.user_id=(select auth.uid())
      ))
    )
  )
);
-- No direct INSERT/UPDATE/DELETE grants: a future controlled replacement
-- RPC must atomically validate assignment, append a version and update the
-- current file pointer. Do not expose version writes to browser clients.
-- Existing storage read policies do not yet permit historical downloads.
