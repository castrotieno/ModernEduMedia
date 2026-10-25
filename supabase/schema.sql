-- ModernEduMedia PRO schema
create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin','teacher','student','guest');
create type public.resource_type as enum ('notes_pdf','video_link','document','image','attachment');
create type public.assessment_type as enum ('Assignment','CAT','Exam','Quiz');
create type public.question_type as enum ('multiple_choice','short_answer','true_false','structured');
create type public.submission_status as enum ('pending','graded','auto_graded');

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text default '', email text not null, role public.user_role default 'student',
 class_id uuid, admission_no text, phone text, avatar_url text, created_at timestamptz default now()
);

create table if not exists public.classes (
 id uuid primary key default gen_random_uuid(), name text not null, academic_year text not null,
 description text, created_at timestamptz default now(), unique(name,academic_year)
);

alter table public.profiles add column if not exists class_id uuid references public.classes(id) on delete set null;

create table if not exists public.subjects (
 id uuid primary key default gen_random_uuid(), code text unique not null, name text not null,
 class_id uuid references public.classes(id) on delete cascade, teacher_id uuid references public.profiles(id) on delete set null,
 description text, created_at timestamptz default now()
);

create table if not exists public.enrollments (
 id uuid primary key default gen_random_uuid(), student_id uuid references public.profiles(id) on delete cascade,
 subject_id uuid references public.subjects(id) on delete cascade, class_id uuid references public.classes(id) on delete cascade,
 enrolled_at timestamptz default now(), unique(student_id,subject_id)
);

create table if not exists public.resources (
 id uuid primary key default gen_random_uuid(), title text not null, description text default '',
 type public.resource_type default 'document', file_url text not null, storage_path text,
 file_name text, file_size bigint, subject_id uuid references public.subjects(id) on delete cascade,
 uploaded_by uuid references public.profiles(id) on delete cascade, download_count integer default 0,
 created_at timestamptz default now()
);

create table if not exists public.assignments (
 id uuid primary key default gen_random_uuid(), title text not null, instructions text default '',
 type public.assessment_type default 'Assignment', subject_id uuid references public.subjects(id) on delete cascade,
 max_score numeric default 100, due_date timestamptz, attachment_url text, created_by uuid references public.profiles(id) on delete cascade,
 created_at timestamptz default now()
);

create table if not exists public.submissions (
 id uuid primary key default gen_random_uuid(), assignment_id uuid references public.assignments(id) on delete cascade,
 student_id uuid references public.profiles(id) on delete cascade, text_answer text, attachment_url text,
 score numeric, feedback text, status public.submission_status default 'pending', submitted_at timestamptz default now(),
 unique(assignment_id,student_id)
);

create table if not exists public.quizzes (
 id uuid primary key default gen_random_uuid(), title text not null, description text default '',
 subject_id uuid references public.subjects(id) on delete cascade, time_limit_minutes integer default 30,
 max_attempts integer default 1, is_published boolean default false, created_by uuid references public.profiles(id) on delete cascade,
 created_at timestamptz default now()
);

create table if not exists public.quiz_questions (
 id uuid primary key default gen_random_uuid(), quiz_id uuid references public.quizzes(id) on delete cascade,
 question_type public.question_type default 'multiple_choice', question_text text not null,
 options jsonb default '[]'::jsonb, correct_answer text not null, marks numeric default 1,
 explanation text, created_at timestamptz default now()
);

create table if not exists public.quiz_attempts (
 id uuid primary key default gen_random_uuid(), quiz_id uuid references public.quizzes(id) on delete cascade,
 student_id uuid references public.profiles(id) on delete cascade, answers jsonb default '{}'::jsonb,
 score numeric default 0, total_marks numeric default 0, percentage numeric default 0,
 submitted_at timestamptz default now(), unique(quiz_id,student_id)
);

create table if not exists public.blogs (
 id uuid primary key default gen_random_uuid(), title text not null, slug text unique not null, content text not null,
 cover_image text, category text, author_id uuid references public.profiles(id) on delete cascade,
 is_published boolean default false, created_at timestamptz default now()
);

create table if not exists public.site_settings (key text primary key,value text default '',updated_at timestamptz default now());
create table if not exists public.contact_messages (
 id uuid primary key default gen_random_uuid(),name text not null,email text not null,subject text,message text not null,created_at timestamptz default now()
);

create index if not exists resources_subject_idx on public.resources(subject_id);
create index if not exists assignments_subject_idx on public.assignments(subject_id);
create index if not exists quizzes_subject_idx on public.quizzes(subject_id);
create index if not exists enrollments_student_idx on public.enrollments(student_id);

create or replace function public.is_admin() returns boolean language sql stable as
$$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;

create or replace function public.is_teacher() returns boolean language sql stable as
$$ select exists(select 1 from public.profiles where id=auth.uid() and role in ('teacher','admin')) $$;

create or replace function public.can_access_subject(target uuid) returns boolean language sql stable as
$$
 select exists(
  select 1 from public.enrollments e
  where e.student_id=auth.uid() and e.subject_id=target
 ) or public.is_teacher();
$$;

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

create policy "profiles read" on public.profiles for select using (true);
create policy "profiles self insert" on public.profiles for insert to authenticated with check (auth.uid()=id);
create policy "profiles self/admin update" on public.profiles for update to authenticated using (auth.uid()=id or public.is_admin());

create policy "classes read" on public.classes for select using (true);
create policy "classes admin all" on public.classes for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "subjects read" on public.subjects for select using (true);
create policy "subjects admin all" on public.subjects for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "subjects teacher update own" on public.subjects for update to authenticated using (teacher_id=auth.uid() or public.is_admin());

create policy "enrollments read" on public.enrollments for select using (auth.uid()=student_id or public.is_teacher());
create policy "enrollments student insert" on public.enrollments for insert to authenticated with check (auth.uid()=student_id);
create policy "enrollments admin all" on public.enrollments for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "resources enrolled read" on public.resources for select using (public.can_access_subject(subject_id));
create policy "resources teacher insert" on public.resources for insert to authenticated with check (public.is_teacher());
create policy "resources owner update" on public.resources for update to authenticated using (uploaded_by=auth.uid() or public.is_admin());
create policy "resources owner delete" on public.resources for delete to authenticated using (uploaded_by=auth.uid() or public.is_admin());

create policy "assignments enrolled read" on public.assignments for select using (public.can_access_subject(subject_id));
create policy "assignments teacher insert" on public.assignments for insert to authenticated with check (public.is_teacher());
create policy "assignments owner update" on public.assignments for update to authenticated using (created_by=auth.uid() or public.is_admin());
create policy "assignments owner delete" on public.assignments for delete to authenticated using (created_by=auth.uid() or public.is_admin());

create policy "submissions read" on public.submissions for select using (auth.uid()=student_id or public.is_teacher());
create policy "submissions student insert" on public.submissions for insert to authenticated with check (auth.uid()=student_id);
create policy "submissions student update pending" on public.submissions for update to authenticated using (auth.uid()=student_id and status='pending');
create policy "submissions teacher grade" on public.submissions for update to authenticated using (public.is_teacher());

create policy "quizzes enrolled read" on public.quizzes for select using (is_published=true and public.can_access_subject(subject_id) or public.is_teacher());
create policy "quizzes teacher write" on public.quizzes for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

create policy "questions read" on public.quiz_questions for select using (
 exists(select 1 from public.quizzes q where q.id=quiz_id and (public.is_teacher() or (q.is_published=true and public.can_access_subject(q.subject_id))))
);
create policy "questions teacher write" on public.quiz_questions for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

create policy "attempts read" on public.quiz_attempts for select using (auth.uid()=student_id or public.is_teacher());
create policy "attempts student insert" on public.quiz_attempts for insert to authenticated with check (auth.uid()=student_id);
create policy "attempts student update own" on public.quiz_attempts for update to authenticated using (auth.uid()=student_id);

create policy "blogs public read" on public.blogs for select using (is_published=true or author_id=auth.uid() or public.is_teacher());
create policy "blogs teacher write" on public.blogs for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

create policy "settings read" on public.site_settings for select using (true);
create policy "settings admin write" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "contact insert" on public.contact_messages for insert to anon,authenticated with check (true);
create policy "contact admin read" on public.contact_messages for select to authenticated using (public.is_admin());

insert into storage.buckets(id,name,public) values ('learning-materials','learning-materials',true)
on conflict(id) do nothing;

create policy "storage public read" on storage.objects for select using (bucket_id='learning-materials');
create policy "storage teacher upload" on storage.objects for insert to authenticated with check (bucket_id='learning-materials' and public.is_teacher());
create policy "storage teacher update" on storage.objects for update to authenticated using (bucket_id='learning-materials' and public.is_teacher());
create policy "storage teacher delete" on storage.objects for delete to authenticated using (bucket_id='learning-materials' and public.is_teacher());

insert into public.classes(name,academic_year,description) values
('Form 1','2026','Junior secondary class'),('Form 2','2026','Intermediate secondary class'),
('Form 3','2026','Senior secondary class'),('Form 4','2026','Final secondary class')
on conflict do nothing;

insert into public.site_settings(key,value) values
('contact_email','castrootienocommercial@gmail.com'),('whatsapp_number','+254741637904'),
('announcement','Welcome to ModernEduMedia PRO: enrollment-based learning, secure file downloads and automatic quiz grading.')
on conflict(key) do nothing;
