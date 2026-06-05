-- =====================================================================
--  SECURE INTELLIGENCE LAB — EVENT REGISTRATION DATABASE
--  Run this ONCE in your Supabase project:
--    Supabase Dashboard  ->  SQL Editor  ->  New query  ->  paste  ->  Run
-- =====================================================================

-- 1) The events table -------------------------------------------------
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  type         text    not null default 'Guest Lecture',  -- Workshop / Seminar / Guest Lecture / Topic Lecture / Special Lecture / Sponsored
  title        text    not null,
  description  text,
  speaker      text,
  speaker_info text,                       -- affiliation / bio / contact of the speaker
  event_date   date    not null,
  event_time   text,                       -- free text e.g. "2:00 – 3:30 PM AEST"
  location     text,
  is_sponsored boolean not null default false,
  sponsor_info text,                       -- who is sponsoring / funding the expert
  link         text,                       -- registration / join URL (optional)
  link_text    text,
  status       text    not null default 'pending',  -- pending / approved / rejected
  submitted_by text,                       -- email of the person who created it
  created_at   timestamptz not null default now()
);

-- 2) Turn on Row Level Security --------------------------------------
alter table public.events enable row level security;

-- Helper: is the current logged-in user the admin?
-- (We compare against the JWT email claim.)
create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'ashraf.uddin@cihe.edu.au';
$$;

-- 3) POLICIES ---------------------------------------------------------

-- 3a) READ policy:
--     * Everyone (even logged-out) can read APPROVED events.
--     * A logged-in contributor can additionally read their OWN events
--       (e.g. their pending submissions) — but NOT other people's pending ones.
--     * The admin can read everything.
drop policy if exists "public read approved" on public.events;
create policy "read approved own or admin"
  on public.events for select
  to anon, authenticated
  using (
    status = 'approved'
    or public.is_admin()
    or submitted_by = (auth.jwt() ->> 'email')
  );

-- 3b) Any LOGGED-IN user can INSERT an event (it starts as 'pending').
drop policy if exists "logged in can insert" on public.events;
create policy "logged in can insert"
  on public.events for insert
  to authenticated
  with check ( auth.uid() is not null );

-- 3c) Admin can UPDATE anything. Organisers can update their OWN events.
drop policy if exists "update own or admin" on public.events;
create policy "update own or admin"
  on public.events for update
  to authenticated
  using ( public.is_admin() or submitted_by = (auth.jwt() ->> 'email') )
  with check ( public.is_admin() or submitted_by = (auth.jwt() ->> 'email') );

-- 3d) Admin can DELETE anything. Organisers can delete their OWN events.
drop policy if exists "delete own or admin" on public.events;
create policy "delete own or admin"
  on public.events for delete
  to authenticated
  using ( public.is_admin() or submitted_by = (auth.jwt() ->> 'email') );

-- =====================================================================
--  DONE WITH THE DATABASE.
--
--  NEXT — turn on self-registration so contributors make their own accounts:
--    Authentication -> Providers -> Email -> make sure "Enable Email provider"
--    is ON, and "Allow new users to sign up" is ON.
--
--  EMAIL CONFIRMATION (your choice):
--    * Confirm email ON  (default, recommended): a new contributor must click a
--      link in their email before they can sign in. Most secure.
--    * Confirm email OFF: accounts work instantly after sign-up (smoother, but
--      anyone can register with any address). Toggle under
--      Authentication -> Providers -> Email -> "Confirm email".
--    The site handles both cases automatically.
--
--  CREATE THE ADMIN ACCOUNT (only this one is made by hand):
--    Authentication -> Users -> Add user
--      Email: ashraf.uddin@cihe.edu.au   (set a password, tick Auto Confirm)
--    This is the account that can approve / reject / edit / delete ANY event.
--
--  You no longer need the shared act.research@... account — every contributor
--  registers individually and only ever sees and edits their own submissions.
-- =====================================================================
