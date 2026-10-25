-- ModernEduMedia v5 SAFE UPGRADE — run entire file in Supabase SQL Editor
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

-- ===== Column repair (v5): older databases may hold tables created BEFORE some columns existed. =====
-- "create table if not exists" never adds columns to an existing table, which caused errors such as
--   Could not find the 'feedback' column of 'submissions' in the schema cache
--   Could not find the 'subject' column of 'contact_messages' in the schema cache
-- Every column the app uses is therefore added here if missing (safe to re-run).
alter table public.profiles add column if not exists full_name text default '';
alter table public.profiles add column if not exists role public.user_role default 'student';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists class_id uuid references public.classes(id) on delete set null;
alter table public.profiles add column if not exists admission_no text;
alter table public.profiles add column if not exists phone text;
alter table public.classes add column if not exists academic_year text;
alter table public.classes add column if not exists description text;
alter table public.classes add column if not exists created_at timestamptz default now();
alter table public.subjects add column if not exists class_id uuid references public.classes(id) on delete cascade;
alter table public.subjects add column if not exists teacher_id uuid references public.profiles(id) on delete set null;
alter table public.subjects add column if not exists description text;
alter table public.subjects add column if not exists created_at timestamptz default now();
alter table public.enrollments add column if not exists class_id uuid references public.classes(id) on delete set null;
alter table public.enrollments add column if not exists enrolled_at timestamptz default now();
alter table public.resources add column if not exists description text default '';
alter table public.resources add column if not exists type public.resource_type default 'document';
alter table public.resources add column if not exists subject_id uuid references public.subjects(id) on delete cascade;
alter table public.resources add column if not exists uploaded_by uuid references public.profiles(id) on delete cascade;
alter table public.resources add column if not exists created_at timestamptz default now();
alter table public.resources add column if not exists storage_path text;
alter table public.resources add column if not exists file_name text;
alter table public.resources add column if not exists file_size bigint;
alter table public.resources add column if not exists download_count integer default 0;
alter table public.assignments add column if not exists instructions text default '';
alter table public.assignments add column if not exists type public.assessment_type default 'Assignment';
alter table public.assignments add column if not exists subject_id uuid references public.subjects(id) on delete cascade;
alter table public.assignments add column if not exists max_score numeric default 100;
alter table public.assignments add column if not exists due_date timestamptz;
alter table public.assignments add column if not exists created_by uuid references public.profiles(id) on delete cascade;
alter table public.assignments add column if not exists created_at timestamptz default now();
alter table public.assignments add column if not exists attachment_url text;
alter table public.submissions add column if not exists text_answer text;
alter table public.submissions add column if not exists attachment_url text;
alter table public.submissions add column if not exists score numeric;
alter table public.submissions add column if not exists feedback text;
alter table public.submissions add column if not exists status public.submission_status default 'pending';
alter table public.submissions add column if not exists submitted_at timestamptz default now();
alter table public.quizzes add column if not exists description text default '';
alter table public.quizzes add column if not exists subject_id uuid references public.subjects(id) on delete cascade;
alter table public.quizzes add column if not exists time_limit_minutes integer default 30;
alter table public.quizzes add column if not exists max_attempts integer default 1;
alter table public.quizzes add column if not exists is_published boolean default false;
alter table public.quizzes add column if not exists created_by uuid references public.profiles(id) on delete cascade;
alter table public.quizzes add column if not exists created_at timestamptz default now();
alter table public.quiz_questions add column if not exists question_type public.question_type default 'multiple_choice';
alter table public.quiz_questions add column if not exists options jsonb default '[]'::jsonb;
alter table public.quiz_questions add column if not exists marks numeric default 1;
alter table public.quiz_questions add column if not exists explanation text;
alter table public.quiz_questions add column if not exists created_at timestamptz default now();
alter table public.quiz_attempts add column if not exists answers jsonb default '{}'::jsonb;
alter table public.quiz_attempts add column if not exists score numeric default 0;
alter table public.quiz_attempts add column if not exists total_marks numeric default 0;
alter table public.quiz_attempts add column if not exists percentage numeric default 0;
alter table public.quiz_attempts add column if not exists submitted_at timestamptz default now();
alter table public.blogs add column if not exists cover_image text;
alter table public.blogs add column if not exists category text;
alter table public.blogs add column if not exists author_id uuid references public.profiles(id) on delete cascade;
alter table public.blogs add column if not exists is_published boolean default false;
alter table public.blogs add column if not exists created_at timestamptz default now();
alter table public.site_settings add column if not exists value text default '';
alter table public.site_settings add column if not exists updated_at timestamptz default now();
alter table public.contact_messages add column if not exists subject text;
alter table public.contact_messages add column if not exists created_at timestamptz default now();

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
create policy "contact insert" on public.contact_messages for insert to anon,authenticated with check(char_length(name)<=200 and char_length(email)<=320 and char_length(message)<=5000 and coalesce(char_length(subject),0)<=300);
create policy "contact admin read" on public.contact_messages for select to authenticated using(public.is_admin());

insert into storage.buckets(id,name,public) values('learning-materials','learning-materials',true) on conflict(id) do nothing;
drop policy if exists "storage public read" on storage.objects; drop policy if exists "storage teacher upload" on storage.objects; drop policy if exists "storage teacher update" on storage.objects; drop policy if exists "storage teacher delete" on storage.objects;
create policy "storage public read" on storage.objects for select using(bucket_id='learning-materials');
create policy "storage teacher upload" on storage.objects for insert to authenticated with check(bucket_id='learning-materials' and public.is_teacher());
create policy "storage teacher update" on storage.objects for update to authenticated using(bucket_id='learning-materials' and public.is_teacher());
create policy "storage teacher delete" on storage.objects for delete to authenticated using(bucket_id='learning-materials' and public.is_teacher());

insert into public.classes(name,academic_year,description) values('Form 1','2026','Junior secondary class'),('Form 2','2026','Intermediate secondary class'),('Form 3','2026','Senior secondary class'),('Form 4','2026','Final secondary class') on conflict do nothing;
insert into public.site_settings(key,value) values('contact_email','castrootienocommercial@gmail.com'),('whatsapp_number','+254741637904'),('announcement','Welcome to ModernEduMedia.') on conflict(key) do update set value=excluded.value,updated_at=now();

-- ===== v2 upgrade: security + editing support (safe to re-run) =====
-- 1. Stop users promoting themselves: only admins (or the Supabase dashboard) may change roles
create or replace function public.guard_role() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then raise exception 'Only admins can change roles'; end if; return new; end $$;
drop trigger if exists guard_role_trg on public.profiles;
create trigger guard_role_trg before update on public.profiles for each row execute function public.guard_role();
drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles for insert to authenticated with check(auth.uid()=id and role in ('student','guest'));
-- 2. Create the profile automatically at sign-up (teacher requests start as guest until an admin approves)
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,email,full_name,role,class_id) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''),
 case when new.raw_user_meta_data->>'role'='student' then 'student'::public.user_role else 'guest'::public.user_role end,
 nullif(new.raw_user_meta_data->>'class_id','')::uuid) on conflict(id) do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- 3. Admin can delete users and manage the contact inbox
drop policy if exists "profiles admin delete" on public.profiles;
create policy "profiles admin delete" on public.profiles for delete to authenticated using(public.is_admin());
drop policy if exists "contact admin delete" on public.contact_messages;
create policy "contact admin delete" on public.contact_messages for delete to authenticated using(public.is_admin());

-- ===== v3 upgrade: quiz attempt limits, "mark as done", student uploads (safe to re-run) =====
alter table public.quizzes alter column max_attempts set default 1;
update public.quizzes set max_attempts=1 where max_attempts is null;
alter table public.quiz_attempts add column if not exists attempt_no integer default 1;
alter table public.quiz_attempts drop constraint if exists quiz_attempts_quiz_id_student_id_key;
create unique index if not exists quiz_attempts_unique_attempt on public.quiz_attempts(quiz_id,student_id,attempt_no);
-- enforce the attempt limit on the server, not just in the browser
create or replace function public.enforce_attempt_limit() returns trigger language plpgsql security definer set search_path=public as $$
declare used int; lim int;
begin select count(*) into used from public.quiz_attempts where quiz_id=new.quiz_id and student_id=new.student_id;
 select coalesce(max_attempts,1) into lim from public.quizzes where id=new.quiz_id;
 if used>=lim then raise exception 'No attempts left for this quiz'; end if; return new; end $$;
drop trigger if exists attempt_limit_trg on public.quiz_attempts;
create trigger attempt_limit_trg before insert on public.quiz_attempts for each row execute function public.enforce_attempt_limit();
drop policy if exists "attempts student update own" on public.quiz_attempts; -- attempts are final once submitted
create table if not exists public.progress(student_id uuid not null references public.profiles(id) on delete cascade,item_type text not null,item_id uuid not null,done_at timestamptz default now(),primary key(student_id,item_type,item_id));
alter table public.progress enable row level security;
drop policy if exists "progress own" on public.progress;
create policy "progress own" on public.progress for all to authenticated using(auth.uid()=student_id) with check(auth.uid()=student_id);
-- students could not upload assignment files before (storage allowed teachers only)
drop policy if exists "storage teacher upload" on storage.objects;
create policy "storage teacher upload" on storage.objects for insert to authenticated with check(bucket_id='learning-materials' and (public.is_teacher() or name like 'assignments/%'));

-- ===== v4 repair: foreign-key errors on submissions / quiz attempts (safe to re-run) =====
-- Older databases can carry foreign keys that point at the wrong table or at rows that no longer exist.
-- 1. Make sure every signed-up user has a profile row
insert into public.profiles(id,email,full_name,role)
select u.id,u.email,coalesce(u.raw_user_meta_data->>'full_name',''),'student' from auth.users u
where not exists(select 1 from public.profiles p where p.id=u.id);
-- 2. Remove orphaned rows (they point at deleted assignments, quizzes or users and would block the repair)
delete from public.submissions where assignment_id not in (select id from public.assignments) or student_id not in (select id from public.profiles);
delete from public.quiz_attempts where quiz_id not in (select id from public.quizzes) or student_id not in (select id from public.profiles);
-- 3. Re-create the keys so they point at the right tables
alter table public.submissions drop constraint if exists submissions_assignment_id_fkey;
alter table public.submissions add constraint submissions_assignment_id_fkey foreign key(assignment_id) references public.assignments(id) on delete cascade;
alter table public.submissions drop constraint if exists submissions_student_id_fkey;
alter table public.submissions add constraint submissions_student_id_fkey foreign key(student_id) references public.profiles(id) on delete cascade;
alter table public.quiz_attempts drop constraint if exists quiz_attempts_quiz_id_fkey;
alter table public.quiz_attempts add constraint quiz_attempts_quiz_id_fkey foreign key(quiz_id) references public.quizzes(id) on delete cascade;
alter table public.quiz_attempts drop constraint if exists quiz_attempts_student_id_fkey;
alter table public.quiz_attempts add constraint quiz_attempts_student_id_fkey foreign key(student_id) references public.profiles(id) on delete cascade;

-- ===== v5: Live Classes + discussion forums (safe to re-run) =====
create table if not exists public.live_classes(
 id uuid primary key default gen_random_uuid(),
 title text not null,
 description text default '',
 subject_id uuid references public.subjects(id) on delete cascade,
 teacher_id uuid references public.profiles(id) on delete set null,
 starts_at timestamptz not null default now(),
 duration_minutes integer default 60,
 provider text default 'jitsi' check(provider in ('jitsi','external')),
 meeting_link text,
 room_name text unique default ('mem-'||replace(gen_random_uuid()::text,'-','')),
 status text default 'scheduled' check(status in ('scheduled','live','ended','cancelled')),
 recording_url text,
 started_at timestamptz,
 ended_at timestamptz,
 created_at timestamptz default now());
create table if not exists public.live_attendance(
 live_class_id uuid not null references public.live_classes(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 joined_at timestamptz default now(),
 primary key(live_class_id,user_id));
create table if not exists public.discussion_threads(
 id uuid primary key default gen_random_uuid(),
 subject_id uuid references public.subjects(id) on delete cascade,
 live_class_id uuid references public.live_classes(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 200),
 body text default '' check(char_length(body)<=4000),
 author_id uuid not null references public.profiles(id) on delete cascade,
 kind text default 'topic' check(kind in ('topic','class_chat')),
 is_pinned boolean default false,
 is_locked boolean default false,
 created_at timestamptz default now(),
 last_activity_at timestamptz default now());
create table if not exists public.discussion_posts(
 id uuid primary key default gen_random_uuid(),
 thread_id uuid not null references public.discussion_threads(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 4000),
 created_at timestamptz default now());

create index if not exists live_classes_subject_idx on public.live_classes(subject_id,starts_at);
create index if not exists live_classes_teacher_idx on public.live_classes(teacher_id);
create index if not exists threads_subject_idx on public.discussion_threads(subject_id,last_activity_at desc);
create index if not exists threads_live_idx on public.discussion_threads(live_class_id);
create index if not exists posts_thread_idx on public.discussion_posts(thread_id,created_at);

-- true for the admin, or for the teacher assigned to that subject (a null subject = whole school, admin only)
create or replace function public.moderates_subject(target uuid) returns boolean language sql stable security definer set search_path=public as $$
 select public.is_admin() or (target is not null and exists(select 1 from public.subjects s where s.id=target and s.teacher_id=auth.uid())) $$;

alter table public.live_classes enable row level security;
alter table public.live_attendance enable row level security;
alter table public.discussion_threads enable row level security;
alter table public.discussion_posts enable row level security;

drop policy if exists "live read" on public.live_classes; drop policy if exists "live teacher insert" on public.live_classes; drop policy if exists "live owner update" on public.live_classes; drop policy if exists "live owner delete" on public.live_classes;
create policy "live read" on public.live_classes for select to authenticated using(subject_id is null or public.can_access_subject(subject_id));
create policy "live teacher insert" on public.live_classes for insert to authenticated with check(public.is_teacher() and teacher_id=auth.uid() and public.moderates_subject(subject_id));
create policy "live owner update" on public.live_classes for update to authenticated using(teacher_id=auth.uid() or public.is_admin()) with check(teacher_id=auth.uid() or public.is_admin());
create policy "live owner delete" on public.live_classes for delete to authenticated using(teacher_id=auth.uid() or public.is_admin());

drop policy if exists "attendance read" on public.live_attendance; drop policy if exists "attendance insert own" on public.live_attendance; drop policy if exists "attendance admin delete" on public.live_attendance;
create policy "attendance read" on public.live_attendance for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.live_classes c where c.id=live_class_id and (c.teacher_id=auth.uid() or public.is_admin())));
create policy "attendance insert own" on public.live_attendance for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.live_classes c where c.id=live_class_id));
create policy "attendance admin delete" on public.live_attendance for delete to authenticated using(public.is_admin());

drop policy if exists "threads read" on public.discussion_threads; drop policy if exists "threads insert" on public.discussion_threads; drop policy if exists "threads update" on public.discussion_threads; drop policy if exists "threads delete" on public.discussion_threads;
create policy "threads read" on public.discussion_threads for select to authenticated using(subject_id is null or public.can_access_subject(subject_id));
create policy "threads insert" on public.discussion_threads for insert to authenticated with check(author_id=auth.uid() and is_pinned=false and is_locked=false and ((subject_id is null and public.is_admin()) or (subject_id is not null and public.can_access_subject(subject_id))));
create policy "threads update" on public.discussion_threads for update to authenticated using(author_id=auth.uid() or public.moderates_subject(subject_id)) with check(author_id=auth.uid() or public.moderates_subject(subject_id));
create policy "threads delete" on public.discussion_threads for delete to authenticated using(author_id=auth.uid() or public.moderates_subject(subject_id));

-- only moderators may pin / lock; nobody may move a thread to another subject or author
create or replace function public.guard_thread() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.author_id is distinct from old.author_id or new.subject_id is distinct from old.subject_id or new.live_class_id is distinct from old.live_class_id then raise exception 'Thread owner and subject cannot be changed'; end if;
 if (new.is_pinned is distinct from old.is_pinned or new.is_locked is distinct from old.is_locked) and auth.uid() is not null and not public.moderates_subject(old.subject_id) then raise exception 'Only the subject teacher or an admin can pin or lock topics'; end if;
 return new; end $$;
drop trigger if exists guard_thread_trg on public.discussion_threads;
create trigger guard_thread_trg before update on public.discussion_threads for each row execute function public.guard_thread();

drop policy if exists "posts read" on public.discussion_posts; drop policy if exists "posts insert" on public.discussion_posts; drop policy if exists "posts delete" on public.discussion_posts;
create policy "posts read" on public.discussion_posts for select to authenticated using(exists(select 1 from public.discussion_threads t where t.id=thread_id));
create policy "posts insert" on public.discussion_posts for insert to authenticated with check(author_id=auth.uid() and exists(select 1 from public.discussion_threads t where t.id=thread_id and (t.is_locked=false or public.moderates_subject(t.subject_id))));
create policy "posts delete" on public.discussion_posts for delete to authenticated using(author_id=auth.uid() or exists(select 1 from public.discussion_threads t where t.id=thread_id and public.moderates_subject(t.subject_id)));

-- keep "last activity" fresh so busy topics rise to the top of the forum
create or replace function public.bump_thread() returns trigger language plpgsql security definer set search_path=public as $$
begin update public.discussion_threads set last_activity_at=now() where id=new.thread_id; return new; end $$;
drop trigger if exists bump_thread_trg on public.discussion_posts;
create trigger bump_thread_trg after insert on public.discussion_posts for each row execute function public.bump_thread();

-- realtime: new posts and class status changes appear without refreshing
alter table public.discussion_posts replica identity full;
alter table public.live_classes replica identity full;
do $$ declare t text; begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach t in array array['live_classes','discussion_posts','discussion_threads'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
    execute format('alter publication supabase_realtime add table public.%I',t);
   end if;
  end loop;
 end if;
end $$;

-- make the API see the new/changed columns immediately (fixes "...in the schema cache" errors)
notify pgrst, 'reload schema';
select 'ModernEduMedia schema v5 is ready' as status;
