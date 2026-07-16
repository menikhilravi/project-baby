-- Care reminders: opt-in push nudges for feeds & diapers, tuned to the baby.
--   * profiles gets per-user opt-in flags + an optional feed-interval override.
--   * care_reminder_state de-dups sends so an overdue gap nudges ONCE per gap
--     (feeds) / ONCE per local day (diapers), not on every cron run.
-- The cron route (/api/cron/care-reminder) is scheduled via Supabase pg_cron —
-- see the commented setup at the bottom.

-- 1. Per-user reminder preferences. Reminders are couple-wide at send time
--    (either partner enabling turns them on for the couple); the flag lives on
--    the profile so each person controls their own opt-in.
alter table public.profiles
  add column if not exists feed_reminders boolean not null default false,
  add column if not exists diaper_reminders boolean not null default false,
  -- Optional override (minutes) for the adaptive feed interval. Null = adaptive.
  add column if not exists feed_interval_min integer;

-- 2. Send-state, keyed by couple (or solo user) + kind, so we never double-nudge.
--    last_ref is the "what we already reminded about": for feeds it's the last
--    feed's occurred_at (a new feed re-arms the reminder); for diapers it's the
--    local date (one nudge per day).
create table if not exists public.care_reminder_state (
  couple_key text not null,
  kind text not null check (kind in ('feed', 'diaper')),
  last_sent_at timestamptz,
  last_ref text,
  primary key (couple_key, kind)
);

-- Only the service-role cron reads/writes this table. Enable RLS with no
-- policies so authenticated clients can't touch it (service role bypasses RLS).
alter table public.care_reminder_state enable row level security;

-- ---------------------------------------------------------------------------
-- Deploy step — schedule the cron with pg_cron + pg_net (run once in the
-- Supabase SQL editor; requires the extensions to be enabled for the project):
--
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--   -- Store the shared secret so it isn't inlined in the job body:
--   alter database postgres set app.cron_secret = '<CRON_SECRET>';
--
--   select cron.schedule('care-reminder', '*/20 * * * *', $$
--     select net.http_get(
--       url := 'https://<APP_URL>/api/cron/care-reminder',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || current_setting('app.cron_secret'))
--     );
--   $$);
-- ---------------------------------------------------------------------------
