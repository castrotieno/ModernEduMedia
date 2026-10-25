-- ModernEduMedia Supabase schema
create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin','teacher','student','guest');
create type public.resource_type as enum ('notes_pdf','video_link','document');
create type public.assessment_type as enum ('CAT','Assignment','Exam');
create type public.submission_status as enum ('pending','graded');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text default '',
  email text not null,
  role public.user_role default 'student',
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  academic_year text not null,
  created_at timestamptz default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  class_id uuid references public.classes(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.student_subject_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  enrolled_at timestamptz default now(),
  unique(student_id, subject_id)
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  type public.resource_type default 'document',
  file_url text not null,
  subject_id uuid references public.subjects(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.assignments_cats (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  type public.assessment_type default 'Assignment',
  subject_id uuid references public.subjects(id) on delete cascade,
  max_score numeric default 100,
  due_date timestamptz not null,
  created_by uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.assignments_cats(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  submission_text text,
  attachment_url text,
  score numeric,
  teacher_feedback text,
  submitted_at timestamptz default now(),
  status public.submission_status default 'pending',
  unique(assignment_id, student_id)
);

create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  content text not null,
  cover_image text,
  category text,
  author_id uuid references public.profiles(id) on delete cascade,
  is_published boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value text default '',
  updated_at timestamptz default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz default now()
);

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_teacher()
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher','admin'));
$$;

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.student_subject_enrollments enable row level security;
alter table public.resources enable row level security;
alter table public.assignments_cats enable row level security;
alter table public.submissions enable row level security;
alter table public.blogs enable row level security;
alter table public.site_settings enable row level security;
alter table public.contact_messages enable row level security;

create policy "profiles public read" on public.profiles for select using (true);
create policy "profiles self insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update to authenticated using (auth.uid() = id or public.is_admin());

create policy "classes read" on public.classes for select using (true);
create policy "classes admin write" on public.classes for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "subjects read" on public.subjects for select using (true);
create policy "subjects admin write" on public.subjects for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "enrollments read" on public.student_subject_enrollments for select using (auth.uid() = student_id or public.is_teacher());
create policy "enrollments student insert" on public.student_subject_enrollments for insert to authenticated with check (auth.uid() = student_id);
create policy "enrollments student delete" on public.student_subject_enrollments for delete to authenticated using (auth.uid() = student_id or public.is_admin());

create policy "resources read" on public.resources for select using (true);
create policy "resources teacher write" on public.resources for insert to authenticated with check (public.is_teacher());
create policy "resources owner update" on public.resources for update to authenticated using (uploaded_by = auth.uid() or public.is_admin());
create policy "resources owner delete" on public.resources for delete to authenticated using (uploaded_by = auth.uid() or public.is_admin());

create policy "assessments read" on public.assignments_cats for select using (true);
create policy "assessments teacher write" on public.assignments_cats for insert to authenticated with check (public.is_teacher());
create policy "assessments owner update" on public.assignments_cats for update to authenticated using (created_by = auth.uid() or public.is_admin());

create policy "submissions read" on public.submissions for select using (auth.uid() = student_id or public.is_teacher());
create policy "submissions student insert" on public.submissions for insert to authenticated with check (auth.uid() = student_id);
create policy "submissions student update" on public.submissions for update to authenticated using (auth.uid() = student_id and status = 'pending');
create policy "submissions teacher grade" on public.submissions for update to authenticated using (public.is_teacher());

create policy "blogs public read" on public.blogs for select using (is_published = true or author_id = auth.uid() or public.is_teacher());
create policy "blogs teacher write" on public.blogs for insert to authenticated with check (public.is_teacher());
create policy "blogs author update" on public.blogs for update to authenticated using (author_id = auth.uid() or public.is_admin());

create policy "settings read" on public.site_settings for select using (true);
create policy "settings admin write" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "contact insert" on public.contact_messages for insert to anon, authenticated with check (true);
create policy "contact admin read" on public.contact_messages for select to authenticated using (public.is_admin());

insert into public.classes (name, academic_year) values
('Form 1','2026'),('Form 2','2026'),('Form 3','2026'),('Form 4','2026');

insert into public.site_settings (key,value) values
('contact_email','castrootienocommercial@gmail.com'),
('whatsapp_number','+254741637904'),
('announcement','Welcome to ModernEduMedia.');
