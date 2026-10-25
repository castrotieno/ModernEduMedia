# ModernEduMedia — GitHub Pages + Supabase

This is a static, GitHub Pages-ready version of ModernEduMedia. It contains a real `index.html`, plus resources, blog, about, contact, login, register and dashboard pages.

## Deploy to GitHub Pages

1. Create a GitHub repository, for example `modernedumedia`.
2. Upload **all files and folders** from this project to the repository root.
3. Go to **Settings → Pages**.
4. Under Source, select **Deploy from a branch**.
5. Choose branch `main` and folder `/ (root)`.
6. Save. Your site will be available at:
   `https://YOUR-USERNAME.github.io/modernedumedia/`

## Supabase setup

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Copy and run the entire contents of `supabase/schema.sql`.
4. The site is already configured to connect to your Supabase project in `assets/js/config.js`.

## Create the first administrator

1. Open `/register.html` and create an account.
2. In Supabase, open **Table Editor → profiles**.
3. Find your user and change `role` from `student` to `admin`.
4. Refresh the site and open `/dashboard.html`.

## Features

- Public homepage, searchable resources, categorized blog, About and Contact pages.
- Supabase email/password authentication.
- Student, teacher and admin dashboards.
- Assignment/CAT submission and grading.
- Subject enrollment and gradebook.
- Academic setup, user-role management, reports and site settings.
- Fully responsive mobile-friendly design.

## Important

The Supabase publishable/anon key is safe for browser use only because Row Level Security is enabled. Never put a service-role key in this static website.
