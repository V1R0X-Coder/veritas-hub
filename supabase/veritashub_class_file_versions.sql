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

-- Append a historical version only through a trusted database function.
-- The caller must be the active lecturer assigned to the class.
create or replace function public.veritashub_record_file_version(
  p_file_id uuid, p_storage_path text, p_file_name text,
  p_mime_type text, p_file_size bigint)
returns integer language plpgsql security definer
set search_path = '' as $$
declare
  v_file public.veritashub_class_files%rowtype;
  v_next integer;
begin
  select * into v_file from public.veritashub_class_files
    where id=p_file_id for update;
  if not found then raise exception 'File not found'; end if;
  if auth.uid() is null or v_file.lecturer_id<>auth.uid() or not exists (
    select 1 from public.veritashub_lecturer_classes lc
    join public.veritashub_lecturers l on l.user_id=lc.lecturer_id
    where lc.class_id=v_file.class_id and lc.lecturer_id=auth.uid() and l.active
  ) then raise exception 'Not authorized'; end if;
  if p_storage_path = v_file.storage_path or p_storage_path not like v_file.class_id::text || '/' || auth.uid()::text || '/%'
    or p_file_name is null or char_length(p_file_name) not between 1 and 200
    or p_file_size not between 1 and 10485760
    or p_mime_type not in (
      'application/pdf','application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation')
  then raise exception 'Invalid replacement file'; end if;
  -- Confirm the uploaded object exists in the private bucket.
  if not exists (select 1 from storage.objects
    where bucket_id='veritashub-class-files' and name=p_storage_path)
  then raise exception 'Replacement upload not found'; end if;
  if exists (select 1 from public.veritashub_class_file_versions where storage_path=p_storage_path) then
    raise exception 'File version already recorded';
  end if;
  -- Never let a caller rebind a historical object to a different file.
  if exists (
    select 1 from public.veritashub_class_files f
    where f.storage_path=p_storage_path
  ) then raise exception 'Storage object is already in use'; end if;
  select coalesce(max(version_number),0)+1 into v_next
    from public.veritashub_class_file_versions where file_id=p_file_id;
  if v_next=1 then
    insert into public.veritashub_class_file_versions
      (file_id,version_number,lecturer_id,storage_path,file_name,mime_type,file_size)
    values (p_file_id,1,auth.uid(),v_file.storage_path,v_file.file_name,v_file.mime_type,v_file.file_size);
    v_next:=2;
  end if;
  insert into public.veritashub_class_file_versions
    (file_id,version_number,lecturer_id,storage_path,file_name,mime_type,file_size)
  values (p_file_id,v_next,auth.uid(),p_storage_path,p_file_name,p_mime_type,p_file_size);
  update public.veritashub_class_files set
    storage_path=p_storage_path,file_name=p_file_name,
    mime_type=p_mime_type,file_size=p_file_size
  where id=p_file_id;
  return v_next;
end $$;
revoke all on function public.veritashub_record_file_version(uuid,text,text,text,bigint) from public,anon;
grant execute on function public.veritashub_record_file_version(uuid,text,text,text,bigint) to authenticated;

-- Historical object access is still gated by current enrollment and published
-- status. Do not grant public bucket access.
create policy "veritashub_storage_read_historical_version"
on storage.objects for select to authenticated using (
  bucket_id='veritashub-class-files' and exists (
    select 1 from public.veritashub_class_file_versions v
    join public.veritashub_class_files f on f.id=v.file_id
    where v.storage_path=storage.objects.name and (
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
