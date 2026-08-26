-- Initial schema for the optometry prescription management app.
-- Patient -> Consultation -> Prescription is one-to-many-to-one:
-- a patient may have many consultations over time, and each
-- consultation's prescription is written once and never overwritten.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- users: mirrors auth.users, holds app-level role/status
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'optometrist' check (role in ('optometrist')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- optometrist_profiles: one profile per optometrist user
-- ---------------------------------------------------------------------------
create table public.optometrist_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  full_name text not null,
  qualification text,
  registration_number text,
  phone text,
  email text,
  clinic_name text,
  clinic_address text,
  city text,
  state text,
  postal_code text,
  signature_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- patients: demographic record, immutable internal id vs. external uid
-- ---------------------------------------------------------------------------
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  uid_emp_id text not null,
  name text not null,
  age integer not null check (age > 0 and age < 150),
  gender text not null check (gender in ('Male', 'Female', 'Other')),
  mobile text,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.users (id),
  updated_by uuid not null references public.users (id)
);

create index patients_uid_emp_id_idx on public.patients (uid_emp_id);
create index patients_name_idx on public.patients (name);
create index patients_mobile_idx on public.patients (mobile);

-- ---------------------------------------------------------------------------
-- consultations: one visit/testing session for a patient
-- ---------------------------------------------------------------------------
create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  optometrist_id uuid not null references public.users (id),
  consultation_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.users (id),
  updated_by uuid not null references public.users (id)
);

create index consultations_patient_id_idx on public.consultations (patient_id);
create index consultations_consultation_date_idx on public.consultations (consultation_date);
create index consultations_optometrist_id_idx on public.consultations (optometrist_id);

-- ---------------------------------------------------------------------------
-- prescriptions: the examination/refraction result for one consultation.
-- One-to-one with consultations; a new consultation is created for a new
-- visit rather than editing/overwriting a past prescription.
-- No PD field and no per-eye color blindness fields (product decision --
-- only a single overall color_blindness_result is captured).
-- ---------------------------------------------------------------------------
create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null unique references public.consultations (id) on delete cascade,

  right_sph numeric(5, 2),
  right_cyl numeric(5, 2),
  right_axis smallint check (right_axis is null or (right_axis >= 0 and right_axis <= 180)),
  right_add numeric(4, 2),

  left_sph numeric(5, 2),
  left_cyl numeric(5, 2),
  left_axis smallint check (left_axis is null or (left_axis >= 0 and left_axis <= 180)),
  left_add numeric(4, 2),

  distance_uncorrected_right text,
  distance_uncorrected_left text,
  distance_corrected_right text,
  distance_corrected_left text,

  near_uncorrected_right text,
  near_uncorrected_left text,
  near_corrected_right text,
  near_corrected_left text,

  pinhole_right text,
  pinhole_left text,

  color_blindness_result text check (color_blindness_result is null or color_blindness_result in ('Normal', 'Abnormal')),

  remarks text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- audit_logs: append-only action trail, no PHI values in metadata
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_user_id_idx on public.audit_logs (user_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at);
