-- Row-level security. Model: single shared clinic. Any authenticated,
-- active optometrist can read/write patient clinical data (patients,
-- consultations, prescriptions) -- this mirrors a real clinic where any
-- optometrist on duty may pull up any patient's record (Search/Status/
-- History are clinic-wide, not per-optometrist silos). Profile rows and
-- signature files are the one place data is private to their owner.

alter table public.users enable row level security;
alter table public.optometrist_profiles enable row level security;
alter table public.patients enable row level security;
alter table public.consultations enable row level security;
alter table public.prescriptions enable row level security;
alter table public.audit_logs enable row level security;

-- Helper: is the current auth.uid() an active optometrist?
create or replace function public.is_active_optometrist()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.role = 'optometrist'
      and u.is_active = true
  );
$$;

-- ---------------------------------------------------------------------------
-- users: a user can read their own row; nothing else (no client-side writes --
-- role/is_active are managed server-side only, via service role).
-- ---------------------------------------------------------------------------
create policy "users_select_self" on public.users
  for select
  using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- optometrist_profiles: any active optometrist can read all profiles
-- (needed to render another optometrist's name/signature on historical
-- prescriptions); only the owner can insert/update/delete their own.
-- ---------------------------------------------------------------------------
create policy "optometrist_profiles_select_all" on public.optometrist_profiles
  for select
  using (public.is_active_optometrist());

create policy "optometrist_profiles_insert_self" on public.optometrist_profiles
  for insert
  with check (user_id = auth.uid());

create policy "optometrist_profiles_update_self" on public.optometrist_profiles
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "optometrist_profiles_delete_self" on public.optometrist_profiles
  for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- patients: shared clinic read/write for any active optometrist.
-- ---------------------------------------------------------------------------
create policy "patients_select_clinic" on public.patients
  for select
  using (public.is_active_optometrist());

create policy "patients_insert_clinic" on public.patients
  for insert
  with check (public.is_active_optometrist() and created_by = auth.uid());

create policy "patients_update_clinic" on public.patients
  for update
  using (public.is_active_optometrist())
  with check (public.is_active_optometrist() and updated_by = auth.uid());

-- No delete policy: patient records are never deleted from the app.

-- ---------------------------------------------------------------------------
-- consultations: shared clinic read/write for any active optometrist.
-- ---------------------------------------------------------------------------
create policy "consultations_select_clinic" on public.consultations
  for select
  using (public.is_active_optometrist());

create policy "consultations_insert_clinic" on public.consultations
  for insert
  with check (public.is_active_optometrist() and created_by = auth.uid());

create policy "consultations_update_clinic" on public.consultations
  for update
  using (public.is_active_optometrist())
  with check (public.is_active_optometrist() and updated_by = auth.uid());

-- No delete policy: consultations are never deleted from the app.

-- ---------------------------------------------------------------------------
-- prescriptions: shared clinic read/write for any active optometrist.
-- Historical prescriptions are never overwritten by the app layer, but RLS
-- still allows update so a same-day draft (Save, before Generate PDF) can be
-- amended prior to finalization.
-- ---------------------------------------------------------------------------
create policy "prescriptions_select_clinic" on public.prescriptions
  for select
  using (public.is_active_optometrist());

create policy "prescriptions_insert_clinic" on public.prescriptions
  for insert
  with check (public.is_active_optometrist());

create policy "prescriptions_update_clinic" on public.prescriptions
  for update
  using (public.is_active_optometrist())
  with check (public.is_active_optometrist());

-- No delete policy: prescriptions are never deleted from the app.

-- ---------------------------------------------------------------------------
-- audit_logs: append-only, write via service role in server actions; any
-- active optometrist may read the log (small clinic, no separate admin
-- role in this MVP).
-- ---------------------------------------------------------------------------
create policy "audit_logs_select_clinic" on public.audit_logs
  for select
  using (public.is_active_optometrist());

create policy "audit_logs_insert_self" on public.audit_logs
  for insert
  with check (user_id = auth.uid());
