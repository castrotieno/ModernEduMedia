-- ModernEduMedia ELITE — SAFE UPGRADE. Run entire file in Supabase SQL Editor.
create extension if not exists "pgcrypto";
do $$ begin
if not exists(select 1 from pg_type where typname='user_role') then create type public.user_role as enum('admin','teacher','student','guest'); end if;
if not exists(select 1 from pg_type where typname='resource_type') then create type public.resource_type as enum('notes_pdf','video_link','document','image','attachment'); end if;
if not exists(select 1 from pg_type where typname='assessment_type') then create type public.assessment_type as enum('Assignment','CAT','Exam','Quiz'); end if;
if not exists(select 1 from pg_type where typname='question_type') then create type public.question_type as enum('multiple_choice','short_answer','true_false','structured'); end if;
if not exists(select 1 from pg_type where typname='submission_status') then create type public.submission_status as enum('pending','graded','auto_graded'); end if;
end $$;

create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade,full_name text default '',email text not null,role public.user_role default 'student',avatar_url text,created_at timestamptz default now());
create table if not exists public.classes(id uuid primary key default gen_random_uuid(),name text not null,academic_year text not null,created_at timestamptz default now());
create table if not exists public.subjects(id uuid primary key default gen_random_uuid(),code text unique not null,name text not null,class_id uuid references public.classes(id) on delete cascade,created_at timestamptz default now());
create table if not exists public.enrollments(id uuid primary key default gen_random_uuid(),student_id uuid not null references public.profiles(id) on delete cascade,subject_id uuid not null references public.subjects(id) on delete cascade,class_id uuid references public.classes(id) on delete set null,enrolled_at timestamptz default now(),unique(student_id,subject_id));
create table if not exists public.resources(id uuid primary key default gen_random_uuid(),title text not null,description text default '',type public.resource_type default 'document',file_url text not null,subject_id uuid references public.subjects(id) on delete cascade,uploaded_by uuid references public.profiles(id) on delete cascade,created_at timestamptz default now());
create table if not exists public.assignments(id uuid primary key default gen_random_uuid(),title text not null,instructions text default '',type public.assessment_type default 'Assignment',subject_id uuid references public.subjects(id) on delete cascade,max_score numeric default 100,due_date timestamptz,created_by uuid references public.profiles(id) on delete cascade,created_at timestamptz default now());
create table if not exists public.submissions(id uuid primary key default gen_random_uuid(),assignment_id uuid not null references public.assignments(id) on delete cascade,student_id uuid not null references public.profiles(id) on delete cascade,text_answer text,attachment_url text,score numeric,feedback text,status public.submission_status default 'pending',submitted_at timestamptz default now(),unique(assignment_id,student_id));
create table if not exists public.quizzes(id uuid primary key default gen_random_uuid(),title text not null,description text default '',subject_id uuid references public.subjects(id) on delete cascade,time_limit_minutes integer default 30,max_attempts integer default 1,is_published boolean default false,created_by uuid references public.profiles(id) on delete cascade,created_at timestamptz default now());
create table if not exists public.quiz_questions(id uuid primary key default gen_random_uuid(),quiz_id uuid not null references public.quizzes(id) on delete cascade,question_type public.question_type default 'multiple_choice',question_text text not null,options jsonb default '[]'::jsonb,correct_answer text not null,marks numeric default 1,explanation text,created_at timestamptz default now());
create table if not exists public.quiz_attempts(id uuid primary key default gen_random_uuid(),quiz_id uuid not null references public.quizzes(id) on delete cascade,student_id uuid not null references public.profiles(id) on delete cascade,answers jsonb default '{}'::jsonb,score numeric default 0,total_marks numeric default 0,percentage numeric default 0,submitted_at timestamptz default now(),unique(quiz_id,student_id));
create table if not exists public.blogs(id uuid primary key default gen_random_uuid(),title text not null,slug text unique not null,content text not null,cover_image text,category text,author_id uuid references public.profiles(id) on delete cascade,is_published boolean default false,created_at timestamptz default now());
create table if not exists public.site_settings(key text primary key,value text default '',updated_at timestamptz default now());
create table if not exists public.contact_messages(id uuid primary key default gen_random_uuid(),name text not null,email text not null,subject text,message text not null,created_at timestamptz default now());

do $$ begin
if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='class_id') then alter table public.profiles add column class_id uuid references public.classes(id) on delete set null; end if;
if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='admission_no') then alter table public.profiles add column admission_no text; end if;
if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='phone') then alter table public.profiles add column phone text; end if;
if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='classes' and column_name='description') then alter table public.classes add column description text; end if;
if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='subjects' and column_name='teacher_id') then alter table public.subjects add column teacher_id uuid references public.profiles(id) on delete set null; end if;
if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='subjects' and column_name='description') then alter table public.subjects add column description text; end if;
if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='resources' and column_name='storage_path') then alter table public.resources add column storage_path text; end if;
if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='resources' and column_name='file_name') then alter table public.resources add column file_name text; end if;
if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='resources' and column_name='file_size') then alter table public.resources add column file_size bigint; end if;
if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='resources' and column_name='download_count') then alter table public.resources add column download_count integer default 0; end if;
if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='assignments' and column_name='attachment_url') then alter table public.assignments add column attachment_url text; end if;
if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='submissions' and column_name='text_answer') then alter table public.submissions add column text_answer text; end if;
end $$;

create index if not exists profiles_class_idx on public.profiles(class_id);
create index if not exists subjects_class_idx on public.subjects(class_id);
create index if not exists enrollments_student_idx on public.enrollments(student_id);
create index if not exists enrollments_subject_idx on public.enrollments(subject_id);
create index if not exists resources_subject_idx on public.resources(subject_id);
create index if not exists assignments_subject_idx on public.assignments(subject_id);
create index if not exists quizzes_subject_idx on public.quizzes(subject_id);
create index if not exists submissions_student_idx on public.submissions(student_id);
create index if not exists quiz_attempts_student_idx on public.quiz_attempts(student_id);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;
create or replace function public.is_teacher() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role in ('teacher','admin')) $$;
create or replace function public.can_access_subject(target uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.enrollments e where e.student_id=auth.uid() and e.subject_id=target) or public.is_teacher() $$;

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.enrollments enable row level security;
alter table public.resources enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.blogs enable row level security;
alter table public.site_settings enable row level security;
alter table public.contact_messages enable row level security;

drop policy if exists "profiles public read" on public.profiles; drop policy if exists "profiles self insert" on public.profiles; drop policy if exists "profiles self/admin update" on public.profiles;
create policy "profiles public read" on public.profiles for select using(true);
create policy "profiles self insert" on public.profiles for insert to authenticated with check(auth.uid()=id);
create policy "profiles self/admin update" on public.profiles for update to authenticated using(auth.uid()=id or public.is_admin());

drop policy if exists "classes read" on public.classes; drop policy if exists "classes admin all" on public.classes;
create policy "classes read" on public.classes for select using(true);
create policy "classes admin all" on public.classes for all to authenticated using(public.is_admin()) with check(public.is_admin());

drop policy if exists "subjects read" on public.subjects; drop policy if exists "subjects admin all" on public.subjects; drop policy if exists "subjects teacher update own" on public.subjects;
create policy "subjects read" on public.subjects for select using(true);
create policy "subjects admin all" on public.subjects for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "subjects teacher update own" on public.subjects for update to authenticated using(teacher_id=auth.uid() or public.is_admin());

drop policy if exists "enrollments read" on public.enrollments; drop policy if exists "enrollments student insert" on public.enrollments; drop policy if exists "enrollments student delete" on public.enrollments; drop policy if exists "enrollments admin all" on public.enrollments;
create policy "enrollments read" on public.enrollments for select using(auth.uid()=student_id or public.is_teacher());
create policy "enrollments student insert" on public.enrollments for insert to authenticated with check(auth.uid()=student_id);
create policy "enrollments student delete" on public.enrollments for delete to authenticated using(auth.uid()=student_id or public.is_admin());
create policy "enrollments admin all" on public.enrollments for all to authenticated using(public.is_admin()) with check(public.is_admin());

drop policy if exists "resources read" on public.resources; drop policy if exists "resources enrolled read" on public.resources; drop policy if exists "resources teacher insert" on public.resources; drop policy if exists "resources owner update" on public.resources; drop policy if exists "resources owner delete" on public.resources;
create policy "resources enrolled read" on public.resources for select using(public.can_access_subject(subject_id));
create policy "resources teacher insert" on public.resources for insert to authenticated with check(public.is_teacher());
create policy "resources owner update" on public.resources for update to authenticated using(uploaded_by=auth.uid() or public.is_admin());
create policy "resources owner delete" on public.resources for delete to authenticated using(uploaded_by=auth.uid() or public.is_admin());

drop policy if exists "assignments read" on public.assignments; drop policy if exists "assignments enrolled read" on public.assignments; drop policy if exists "assignments teacher insert" on public.assignments; drop policy if exists "assignments owner update" on public.assignments; drop policy if exists "assignments owner delete" on public.assignments;
create policy "assignments enrolled read" on public.assignments for select using(public.can_access_subject(subject_id));
create policy "assignments teacher insert" on public.assignments for insert to authenticated with check(public.is_teacher());
create policy "assignments owner update" on public.assignments for update to authenticated using(created_by=auth.uid() or public.is_admin());
create policy "assignments owner delete" on public.assignments for delete to authenticated using(created_by=auth.uid() or public.is_admin());

drop policy if exists "submissions read" on public.submissions; drop policy if exists "submissions student insert" on public.submissions; drop policy if exists "submissions student update pending" on public.submissions; drop policy if exists "submissions teacher grade" on public.submissions;
create policy "submissions read" on public.submissions for select using(auth.uid()=student_id or public.is_teacher());
create policy "submissions student insert" on public.submissions for insert to authenticated with check(auth.uid()=student_id);
create policy "submissions student update pending" on public.submissions for update to authenticated using(auth.uid()=student_id and status='pending');
create policy "submissions teacher grade" on public.submissions for update to authenticated using(public.is_teacher());

drop policy if exists "quizzes read" on public.quizzes; drop policy if exists "quizzes enrolled read" on public.quizzes; drop policy if exists "quizzes teacher write" on public.quizzes;
create policy "quizzes enrolled read" on public.quizzes for select using((is_published=true and public.can_access_subject(subject_id)) or public.is_teacher());
create policy "quizzes teacher write" on public.quizzes for all to authenticated using(public.is_teacher()) with check(public.is_teacher());

drop policy if exists "questions read" on public.quiz_questions; drop policy if exists "questions teacher write" on public.quiz_questions;
create policy "questions read" on public.quiz_questions for select using(exists(select 1 from public.quizzes q where q.id=quiz_id and (public.is_teacher() or (q.is_published=true and public.can_access_subject(q.subject_id)))));
create policy "questions teacher write" on public.quiz_questions for all to authenticated using(public.is_teacher()) with check(public.is_teacher());

drop policy if exists "attempts read" on public.quiz_attempts; drop policy if exists "attempts student insert" on public.quiz_attempts; drop policy if exists "attempts student update own" on public.quiz_attempts;
create policy "attempts read" on public.quiz_attempts for select using(auth.uid()=student_id or public.is_teacher());
create policy "attempts student insert" on public.quiz_attempts for insert to authenticated with check(auth.uid()=student_id);
create policy "attempts student update own" on public.quiz_attempts for update to authenticated using(auth.uid()=student_id);

drop policy if exists "blogs public read" on public.blogs; drop policy if exists "blogs teacher write" on public.blogs;
create policy "blogs public read" on public.blogs for select using(is_published=true or author_id=auth.uid() or public.is_teacher());
create policy "blogs teacher write" on public.blogs for all to authenticated using(public.is_teacher()) with check(public.is_teacher());

drop policy if exists "settings read" on public.site_settings; drop policy if exists "settings admin write" on public.site_settings;
create policy "settings read" on public.site_settings for select using(true);
create policy "settings admin write" on public.site_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());

drop policy if exists "contact insert" on public.contact_messages; drop policy if exists "contact admin read" on public.contact_messages;
create policy "contact insert" on public.contact_messages for insert to anon,authenticated with check(true);
create policy "contact admin read" on public.contact_messages for select to authenticated using(public.is_admin());

insert into storage.buckets(id,name,public) values('learning-materials','learning-materials',true) on conflict(id) do nothing;
drop policy if exists "storage public read" on storage.objects; drop policy if exists "storage teacher upload" on storage.objects; drop policy if exists "storage teacher update" on storage.objects; drop policy if exists "storage teacher delete" on storage.objects;
create policy "storage public read" on storage.objects for select using(bucket_id='learning-materials');
create policy "storage teacher upload" on storage.objects for insert to authenticated with check(bucket_id='learning-materials' and public.is_teacher());
create policy "storage teacher update" on storage.objects for update to authenticated using(bucket_id='learning-materials' and public.is_teacher());
create policy "storage teacher delete" on storage.objects for delete to authenticated using(bucket_id='learning-materials' and public.is_teacher());

insert into public.classes(name,academic_year,description) values('Form 1','2026','Junior secondary class'),('Form 2','2026','Intermediate secondary class'),('Form 3','2026','Senior secondary class'),('Form 4','2026','Final secondary class') on conflict do nothing;
insert into public.site_settings(key,value) values('contact_email','castrootienocommercial@gmail.com'),('whatsapp_number','+254741637904'),('announcement','Welcome to ModernEduMedia ELITE.') on conflict(key) do update set value=excluded.value,updated_at=now();
