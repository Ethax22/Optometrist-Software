-- Private storage bucket for optometrist signature images.
-- Files are stored at path: {user_id}/{filename}. Never made public --
-- signatures are only ever served via short-lived signed URLs generated
-- server-side.

insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', false)
on conflict (id) do nothing;

create policy "signatures_select_clinic" on storage.objects
  for select
  using (
    bucket_id = 'signatures'
    and public.is_active_optometrist()
  );

create policy "signatures_insert_own_folder" on storage.objects
  for insert
  with check (
    bucket_id = 'signatures'
    and public.is_active_optometrist()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "signatures_update_own_folder" on storage.objects
  for update
  using (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "signatures_delete_own_folder" on storage.objects
  for delete
  using (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
