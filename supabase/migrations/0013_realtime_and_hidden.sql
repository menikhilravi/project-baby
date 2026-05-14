-- 1. Make DELETE replication on baby_events include all columns so
--    Realtime subscriptions with filters (e.g. couple_id=eq.X) match on delete.
--    Default REPLICA IDENTITY only sends PK columns for DELETE, so a
--    filter on couple_id silently drops every delete event.
alter table public.baby_events replica identity full;

-- 2. Per-user hidden nav sections. Stored as a list of section keys
--    (e.g. {'rewards','nursery'}). Empty/null = nothing hidden.
alter table public.profiles
  add column if not exists hidden_sections text[] not null default '{}'::text[];
