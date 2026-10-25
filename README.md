# ModernEduMedia PRO — GitHub Pages + Supabase

An upgraded static learning management system with class-based enrollment, secure file uploads/downloads, assignments, auto-graded quizzes, blogs, reports and complete admin control.

## Deploy to GitHub Pages

1. Create a GitHub repository.
2. Upload every file and folder from this project to the repository **root**.
3. Go to **Settings → Pages**.
4. Select **Deploy from a branch**, branch `main`, folder `/ (root)`.
5. Save. Visit: `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`

## Supabase setup

1. Open Supabase → SQL Editor.
2. Run the complete contents of `supabase/schema.sql`.
3. The database creates classes, subjects, enrollments, resources, assignments, submissions, quizzes, questions, attempts, blogs, settings and contact messages.
4. It also creates the public `learning-materials` storage bucket and RLS policies.

## First admin

1. Open `register.html`, create a teacher account.
2. In Supabase → Table Editor → `profiles`, set that account’s `role` to `admin`.
3. Refresh and open `dashboard.html`.

## Enrollment access

Students can enroll only in subjects belonging to their selected class. Resources, assignments and quizzes are visible only after enrollment, enforced through the `can_access_subject()` RLS function.

## Automatic grading

Quiz builder supports:

- Multiple choice
- True / false
- Short answer
- Structured / teacher-graded questions

MCQ, true/false and exact short answers are marked automatically. Structured responses are saved for teacher review.

## Security

The publishable Supabase key is browser-safe only because Row Level Security is enabled. Never place a service-role key in this static website.
