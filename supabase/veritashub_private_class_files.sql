-- Private teaching files. Additive migration; does not modify existing StudyLink data.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('veritashub-class-files','veritashub-class-files',false,10485760,
 array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do nothing;

create table if not exists public.veritashub_class_files (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.veritashub_classes(id) on delete cascade,
 lecturer_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 3 and 160),
 file_name text not null check (char_length(file_name) between 1 and 200),
 storage_path text not null unique check (char_length(storage_path) between 10 and 500),
 mime_type text not null check (mime_type in (
 'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation')),
 file_size bigint not null check (file_size between 1 and 10485760),
 published boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists veritashub_class_files_class_idx on public.veritashub_class_files(class_id,published);
alter table public.veritashub_class_files enable row level security;
revoke all on public.veritashub_class_files from anon,authenticated;
grant select,insert,delete on public.veritashub_class_files to authenticated;

create policy "veritashub_files_read_author_or_enrolled" on public.veritashub_class_files
for select to authenticated using (
 (lecturer_id=(select auth.uid()) and exists (
 select 1 from public.veritashub_lecturer_classes lc join public.veritashub_lecturers l on l.user_id=lc.lecturer_id
 where lc.class_id=veritashub_class_files.class_id and lc.lecturer_id=(select auth.uid()) and l.active))
 or (published and exists (
 select 1 from public.veritashub_class_enrollments e
 where e.class_id=veritashub_class_files.class_id and e.user_id=(select auth.uid())))
);
create policy "veritashub_files_insert_assigned" on public.veritashub_class_files
for insert to authenticated with check (
 lecturer_id=(select auth.uid()) and storage_path like class_id::text || '/' || lecturer_id::text || '/%'
 and exists (select 1 from public.veritashub_lecturer_classes lc
 join public.veritashub_lecturers l on l.user_id=lc.lecturer_id
 where lc.class_id=veritashub_class_files.class_id and lc.lecturer_id=(select auth.uid()) and l.active)
);
create policy "veritashub_files_delete_author" on public.veritashub_class_files
for delete to authenticated using (lecturer_id=(select auth.uid()) and exists (
 select 1 from public.veritashub_lecturer_classes lc join public.veritashub_lecturers l on l.user_id=lc.lecturer_id
 where lc.class_id=veritashub_class_files.class_id and lc.lecturer_id=(select auth.uid()) and l.active));

-- Storage object names: class UUID / lecturer UUID / random UUID.extension.
create policy "veritashub_storage_upload_assigned" on storage.objects
for insert to authenticated with check (
 bucket_id='veritashub-class-files'
 and (storage.foldername(name))[2]=(select auth.uid())::text
 and exists (select 1 from public.veritashub_lecturer_classes lc
 join public.veritashub_lecturers l on l.user_id=lc.lecturer_id
 where lc.class_id::text=(storage.foldername(name))[1]
 and lc.lecturer_id=(select auth.uid()) and l.active)
);
create policy "veritashub_storage_read_author_or_enrolled" on storage.objects
for select to authenticated using (
 bucket_id='veritashub-class-files' and (
 ((storage.foldername(name))[2]=(select auth.uid())::text and exists (
 select 1 from public.veritashub_lecturer_classes lc
 join public.veritashub_lecturers l on l.user_id=lc.lecturer_id
 where lc.class_id::text=(storage.foldername(name))[1]
 and lc.lecturer_id=(select auth.uid()) and l.active))
 or exists (select 1 from public.veritashub_class_files f
 join public.veritashub_class_enrollments e on e.class_id=f.class_id
 where f.storage_path=storage.objects.name and f.published and e.user_id=(select auth.uid()))
 ));
create policy "veritashub_storage_delete_author" on storage.objects
for delete to authenticated using (
 bucket_id='veritashub-class-files'
 and (storage.foldername(name))[2]=(select auth.uid())::text
 and exists (select 1 from public.veritashub_lecturer_classes lc
 join public.veritashub_lecturers l on l.user_id=lc.lecturer_id
 where lc.class_id::text=(storage.foldername(name))[1]
 and lc.lecturer_id=(select auth.uid()) and l.active)
);
