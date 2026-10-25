# ModernEduMedia FINAL — GitHub Pages + Supabase

A fully coordinated static LMS with class-based enrollment, secure file uploads/downloads, assignments, auto-graded quizzes, blogs, reports and complete admin management.

## Fixed issue

The previous upload error:

`Cannot read properties of null (reading 'reset')`

was caused by resetting a form after its HTML had been replaced. Every upload and creation form now captures `e.currentTarget` before awaiting Supabase, then resets the correct form safely.

## Admin delete controls

Admins can delete:

- Users / profiles
- Classes
- Subjects
- Enrollments
- Resources, including their stored file
- Assignments
- Quizzes

Each management table includes a red **Delete** button with confirmation.

## v2 changes

- New look: chalk-and-graph-paper identity, Bricolage Grotesque + Figtree, restyled dashboards, tables and forms.
- **Edit buttons** (modal editor) for classes, subjects, resources, assignments, quizzes, blog articles and users, on admin and teacher pages.
- Teachers get a **My Content** tab listing everything they published, with Edit and Delete. Admins get **All Blogs** and a **Messages** inbox.
- Blog: featured first article, cover images, read time, safe paragraph rendering (the old version injected raw HTML), WhatsApp share.
- Site announcement from Site Settings now shows as a banner.
- Security: users can no longer promote themselves to admin; teacher sign-ups start as guest until approved. **Re-run `supabase/schema.sql`** to apply this.

## Deploy to GitHub Pages

1. Upload every file and folder to your GitHub repository root.
2. Go to Settings → Pages.
3. Choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Save.

## Supabase setup

Run the entire `supabase/schema.sql` in Supabase SQL Editor. It is safe to run over an existing database and will not cause “already exists” errors.

## First admin

1. Register through `register.html`.
2. In Supabase → Table Editor → `profiles`, set your role to `admin`.
3. Refresh and open `dashboard.html`.
