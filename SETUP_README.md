# Secure Intelligence Lab — Event Registration Setup

Your site is a **static website** (plain HTML/JS), so it runs on GitHub Pages with
no build step. Events and accounts live in **Supabase** (free database + login).

**What's new in this version**
- Contributors **create their own account** (name, organisation, email, password) —
  no more shared `act.research@…` login.
- Each person only sees and manages **their own** submissions, so two people
  working at the same time never clash.
- A **dedicated, shareable link** drops people straight onto the registration page.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Site + **Contributor Login** button, a Login/Register pop-up, and a **My Events** dashboard. |
| `submit-event.html` | **The link you share.** A clean landing page that sends people straight to the sign-up/submit flow. |
| `supabase-config.js` | Your Supabase URL + public key + admin email. Public-safe to commit. |
| `events-app.js` | All login / register / submit / approve / edit / delete logic. |
| `SUPABASE_SETUP.sql` | Database table + security rules. Run once. |
| `data-events.js` | Offline fallback if the database is ever unreachable. |

Publications, Projects, and Team profiles are **unchanged**.

---

## One-time setup

### Step 1 — Create the database
1. https://supabase.com -> open your project (`vblvukqtcdtltmyuglzc`).
2. **SQL Editor -> New query** -> paste all of `SUPABASE_SETUP.sql` -> **Run**.

### Step 2 — Turn on self-registration
1. **Authentication -> Providers -> Email**: ensure the Email provider is **ON** and
   **"Allow new users to sign up"** is **ON**.
2. **Confirm email** (your choice):
   - **ON** (recommended): a new contributor clicks a link in their email before
     they can sign in.
   - **OFF**: accounts work instantly after sign-up.
   The site handles both automatically.

### Step 3 — Create the admin account (the only manual account)
- **Authentication -> Users -> Add user**
  - Email: `ashraf.uddin@cihe.edu.au`, set a password, tick **Auto Confirm User**.
- This account can **approve / reject / edit / delete any** event, and its own
  posts publish instantly. (The admin email is set in `supabase-config.js`. If you
  change it, also update it in `SUPABASE_SETUP.sql`'s `is_admin()` function and
  re-run the SQL.)

### Step 4 — Publish on GitHub Pages
1. Upload all files (keep names) to a GitHub repo.
2. **Settings -> Pages -> Deploy from a branch -> `main` / `/root` -> Save**.
3. Live at `https://<username>.github.io/<repo>/`.

---

## The links you share

Once live, share **either** of these (replace the base with your real URL):

- **Best — dedicated page:**
  `https://<username>.github.io/<repo>/submit-event.html`
  A branded landing page that auto-forwards into the create-account form.

- **Direct deep-links into the main site:**
  - Create account: `.../index.html#register`
  - Sign in & submit: `.../index.html#submit-event`

All of these open the right pop-up automatically.

---

## Day-to-day

**A contributor wants to run a session**
1. They open your shared `submit-event.html` link.
2. They click **Create an account & submit**, enter name, organisation, email and a
   password. (If email confirmation is on, they confirm via email, then sign in.)
3. The **dashboard** opens. They fill in: type (Workshop / Seminar / Guest Lecture /
   Topic / Special / Webinar / Sponsored), topic, description, date, time, location,
   speaker name + info, optional registration link. For a **sponsored** session they
   tick the box and add funding details.
4. **Submit** -> saved as **pending** (not yet public). They can return anytime,
   sign in, and edit or delete their own events.

**You (admin) review**
1. Sign in with `ashraf.uddin@cihe.edu.au` -> **My Events**.
2. For each submission: **Approve** (publishes), **Reject** (hides), **Edit**, or
   **Delete**. Approved events appear instantly in the public Events section.

**Visitors** see only approved events — no login needed.

---

## Why this prevents conflicts
Each event row is tagged with its creator's email, and the database rules only let a
contributor read/update/delete rows they created. Different contributors are fully
isolated from one another; only the admin sees and controls everything. So any number
of people can submit at the same time without stepping on each other.

---

## Optional next steps (ask if you want them)
- Email the admin automatically when a new event is submitted (Supabase Edge
  Function or Zapier).
- A public "Register to attend" flow for students signing up to attend events.
