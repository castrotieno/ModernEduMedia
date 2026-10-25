# ModernEduMedia ELITE — Premium GitHub Pages + Supabase LMS

A world-class styled, fully coordinated learning management system with premium public pages, beautiful dashboards, auto-graded quizzes, secure file uploads/downloads and complete admin CRUD control.

## Premium design upgrades

- Modern gradient identity with indigo, violet and cyan accents
- Animated background orbs and glassmorphism surfaces
- Premium hero with live-style learning cards and platform statistics
- Redesigned blog with featured article, category chips and rich cards
- Premium dashboard sidebar, animated stat cards, polished tables and modals
- Responsive mobile-first layout

## Admin full control

Admins can now:

- Create classes and subjects
- Assign teachers to subjects
- Enroll or remove students
- Edit and update users, classes, subjects, resources, assignments and quizzes
- Delete any record with confirmation
- Delete resources together with their stored Supabase Storage file
- View institution-wide analytics and printable reports

## Fixed upload issue

All forms now preserve the original form element before awaiting Supabase operations. This eliminates:

`Cannot read properties of null (reading 'reset')`

## Deploy to GitHub Pages

1. Upload every file and folder to your GitHub repository root.
2. Go to Settings → Pages.
3. Select **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Save.

## Supabase setup

Run the entire `supabase/schema.sql` in Supabase SQL Editor. It is safe over an existing database and preserves current data.

## First admin

1. Register through `register.html`.
2. In Supabase → Table Editor → `profiles`, set role to `admin`.
3. Refresh and open `dashboard.html`.
