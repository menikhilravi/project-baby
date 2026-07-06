-- Contraction timer: the pregnant user taps to start a contraction (tightening
-- begins) and taps again to end it. Reuse baby_events with `kind='contraction'`,
-- where occurred_at = start and ended_at = end. A row with ended_at = null is a
-- contraction currently in progress. Frequency / duration / the 5-1-1 pattern are
-- all derived on read, not stored.

-- 1. Extend the kind check to include 'contraction'.
alter table public.baby_events
  drop constraint if exists baby_events_kind_check;
alter table public.baby_events
  add constraint baby_events_kind_check
  check (kind in ('feed', 'diaper', 'sleep', 'kick', 'contraction'));

-- 2. Hot-path index for "contractions in the last N hours" queries.
create index if not exists baby_events_contractions_idx
  on public.baby_events(couple_id, occurred_at desc)
  where kind = 'contraction';

-- 3. Only one open (in-progress) contraction at a time keeps the start/stop
--    toggle safe — mirrors the one-open-sleep guard in 0009.
create unique index if not exists baby_events_one_open_contraction
  on public.baby_events(couple_id)
  where kind = 'contraction' and ended_at is null and couple_id is not null;
create unique index if not exists baby_events_one_open_contraction_solo
  on public.baby_events(user_id)
  where kind = 'contraction' and ended_at is null and couple_id is null;
