-- Prevent deletion of current or historical teaching-file objects.
-- Existing permissive lecturer delete policy still governs unreferenced uploads.
create policy "veritashub_protect_referenced_objects"
on storage.objects as restrictive for delete to authenticated using (
  bucket_id <> 'veritashub-class-files'
  or (
    not exists (select 1 from public.veritashub_class_files f where f.storage_path=storage.objects.name)
    and not exists (select 1 from public.veritashub_class_file_versions v where v.storage_path=storage.objects.name)
  )
);
