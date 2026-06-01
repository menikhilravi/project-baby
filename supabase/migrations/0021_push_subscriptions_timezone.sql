-- Store the subscriber's local IANA timezone so the kick reminder cron
-- can respect quiet hours (skip notifications outside 6am–10pm local
-- time). Captured at subscribe time from the browser's
-- Intl.DateTimeFormat resolvedOptions().timeZone — accurate per device.

alter table public.push_subscriptions
  add column if not exists timezone text;
