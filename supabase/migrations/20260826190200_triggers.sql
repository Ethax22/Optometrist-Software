-- updated_at maintenance + auto-provisioning of public.users on signup.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.optometrist_profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.patients
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.consultations
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.prescriptions
  for each row execute function public.set_updated_at();

-- When a new auth.users row is created (sign-up), mirror it into
-- public.users as an active optometrist. Runs with definer rights since
-- the auth trigger fires before any RLS-governed session exists.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role, is_active)
  values (new.id, new.email, 'optometrist', true)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
