-- RLS policies only restrict access on top of a baseline GRANT -- they do
-- not substitute for one. Without these grants, PostgREST/Postgres denies
-- every query with "permission denied for table X" before RLS is even
-- evaluated. Supabase's hosted projects wire this up via dashboard-managed
-- default privileges; a from-scratch schema needs it explicit.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update on public.users to authenticated;
grant select, insert, update, delete on public.optometrist_profiles to authenticated;
grant select, insert, update on public.patients to authenticated;
grant select, insert, update on public.consultations to authenticated;
grant select, insert, update on public.prescriptions to authenticated;
grant select, insert on public.audit_logs to authenticated;

grant execute on function public.is_active_optometrist() to authenticated;

-- Ensure tables created by future migrations in this schema inherit the
-- same baseline grants automatically.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
