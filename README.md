# ModernEduMedia v5 — GitHub Pages + Supabase

A static LMS (no build step): class-based enrollment, notes and uploads, assignments, auto-graded quizzes, blogs, reports, **Live Classes** and **discussion forums**.

## 1. Update your database (required, 1 minute)

Open **Supabase → SQL Editor**, paste the **entire** `supabase/schema.sql`, click **Run**. It is safe to run again at any time.

This one run:
- adds every column the app uses that an older database may be missing, including `submissions.feedback` and `contact_messages.subject`;
- creates the Live Classes and forum tables with their security rules;
- ends with `notify pgrst, 'reload schema'` so Supabase refreshes its schema cache straight away.

Then upload all files to your GitHub repository root (Settings → Pages → Deploy from a branch → `main` / root).

## 2. What is new in v5

### Live Classes (new tab in the navigation bar → `live.html`)
- **Teachers** open *Live Classes → Schedule a class*: title, subject, date/time, duration, description, and a platform:
  - **Built-in video room** (Jitsi, no account needed) — the lesson runs inside the page; or
  - **External link** (Google Meet, Zoom, Teams) — students get an *Open the meeting* button.
- The teacher presses **Start class**; students then see a red **Join class** button (also a pulsing dot beside "Live Classes" in the menu). Students join muted.
- **Class chat** beside the video for every class, also readable after the lesson ends.
- Teachers can **End**, **Edit** (add a **recording link** afterwards), **Cancel**, **Delete**, and see **Attendance** (with CSV download).
- Students can add a class to Google Calendar and open a class directly with `live.html?class=<id>` (Copy invite link).

### Discussion Forum (second tab on the same page, and a sidebar link in every dashboard)
- Topics per subject; students post in the subjects they are enrolled in, teachers in the subjects they teach, admins everywhere (including *Whole school*).
- Subject teachers and admins can **pin**, **lock** and **delete** topics and replies. Authors can delete their own.
- New replies appear without refreshing (Supabase Realtime, with a 15-second fallback refresh).

### Fixes
| Problem | Fix |
|---|---|
| Grading console: *Could not find the 'feedback' column of 'submissions' in the schema cache* | `schema.sql` now adds the missing column and reloads the cache. If the database has not been updated yet, the grade is still saved and a message tells you to run the SQL. |
| Contact page: error in the **Subject** field | `schema.sql` adds `contact_messages.subject`. The form also works on an old database (the subject is kept inside the message), validates input and shows a clear success/error message. |
| Navigation differed on every page (no menu button, no login state, no Sign out, nothing on login/register/blog pages) | One shared navigation bar and footer (`assets/js/app.js`) on every page: active page highlighted, mobile menu that closes properly, Dashboard / Sign out when logged in. |
| Dashboard **Sign out** button did nothing | Now works. |
| Pending teacher accounts (role *guest*) crashed the dashboard | They now see an "Waiting for approval" page. |
| Grading console showed every submission and accepted any score | Shows only your own subjects, filters To grade / Graded / All, searches, limits the score to the assignment maximum. |
| Quiz builder accepted a correct answer that matched none of the options (made the question impossible to pass); explanation field was never shown | Validated; explanation field added. |
| Students without a class could not enroll and could not change class | Class can be chosen in *My Profile*. |
| *My Students* listed every enrollment in the school | Only students in your subjects. |
| Teacher "Pending grading" counted other teachers' work | Counts only your assignments. |
| Contact form could be flooded with huge messages | Length limits enforced by the database. |
| Resources page was blank for visitors who are not signed in | Shows a sign-in prompt. |
| Mobile menu position broke when the announcement banner was showing | Menu is attached to the header. Announcement can be dismissed. |

Theme: the chalk-and-graph-paper look (teal board, chalk yellow, pencil red, Bricolage Grotesque + Figtree) is kept and extended to the new pages.

## 3. Settings (`assets/js/config.js`)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — your project.
- `JITSI_DOMAIN` — video server for the built-in room. Default `meet.jit.si` (free). The first person to open a room on the public server (the teacher) may be asked to sign in once. To avoid this, point it at your own Jitsi or 8x8 server. For classes with more than a few dozen students, a dedicated server or an external link (Meet/Zoom) is recommended.

## 4. First admin
1. Register through `register.html`.
2. In Supabase → Table Editor → `profiles`, set your `role` to `admin`.
3. Admin → *Users*: approve teachers by changing their role from `guest` to `teacher`; *Subjects*: assign each subject a teacher (teachers can only schedule classes for subjects assigned to them).

## Earlier versions
v4: foreign-key repair for submissions and quiz attempts. v3: attempt limits, timed quizzes, mark-as-done progress. v2: editing, security hardening, blog and inbox upgrades.
