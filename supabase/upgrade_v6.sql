-- v6 upgrade (also appended to schema.sql). Safe to run repeatedly.
alter table public.assignments add column if not exists opens_at timestamptz;
alter table public.assignments add column if not exists duration_minutes integer;
alter table public.assignments add column if not exists allow_late boolean default true;
alter table public.blogs add column if not exists excerpt text;
alter table public.blogs add column if not exists featured boolean default false;
notify pgrst, 'reload schema';
