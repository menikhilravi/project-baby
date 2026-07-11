-- Tier-1 newborn health features, all on the existing baby_events table:
--   * kind='temp' — a temperature reading (amount + unit 'f'|'c'). Powers the
--     under-3-months fever alert.
--   * kind='med'  — a dose given (subtype = which med, optional amount+unit).
--     Powers the daily vitamin-D check and a "what was given, when" list.
--   * Breastfeeding sessions: a feed with subtype 'left'|'right' can now be a
--     *timed* nursing session (occurred_at = latch on, ended_at = unlatch).
--     To make `ended_at IS NULL` newly mean "nursing in progress", every
--     existing instant feed is backfilled to ended_at = occurred_at.

-- 1. Extend the kind check to include 'temp' and 'med'.
alter table public.baby_events
  drop constraint if exists baby_events_kind_check;
alter table public.baby_events
  add constraint baby_events_kind_check
  check (kind in ('feed', 'diaper', 'sleep', 'kick', 'contraction', 'temp', 'med'));

-- 2. Allow med subtypes alongside the existing diaper/feed ones.
alter table public.baby_events
  drop constraint if exists baby_events_subtype_check;
alter table public.baby_events
  add constraint baby_events_subtype_check
  check (
    subtype is null
    or (kind = 'diaper' and subtype in ('pee', 'poop', 'both'))
    or (kind = 'feed' and subtype in ('left', 'right', 'bottle', 'solid'))
    or (kind = 'med' and subtype in ('vitamin_d', 'tylenol', 'gas_drops', 'probiotic', 'other'))
  );

-- 3. Units now cover temperature (f/c) and dose amounts (iu/mg/ml).
alter table public.baby_events
  drop constraint if exists baby_events_unit_check;
alter table public.baby_events
  add constraint baby_events_unit_check
  check (unit is null or unit in ('oz', 'ml', 'f', 'c', 'iu', 'mg'));

-- 4. Backfill: existing instant feeds get ended_at = occurred_at so that a
--    feed with ended_at IS NULL can newly mean "nursing session in progress".
update public.baby_events
  set ended_at = occurred_at
  where kind = 'feed' and ended_at is null;

-- 5. At most one open nursing session at a time per couple / solo user —
--    mirrors the one-open-sleep guard in 0009.
create unique index if not exists baby_events_one_open_nursing
  on public.baby_events(couple_id)
  where kind = 'feed' and ended_at is null and couple_id is not null;
create unique index if not exists baby_events_one_open_nursing_solo
  on public.baby_events(user_id)
  where kind = 'feed' and ended_at is null and couple_id is null;

-- 6. Hot-path index for the Today health cards (latest temp, meds today).
create index if not exists baby_events_health_idx
  on public.baby_events(couple_id, occurred_at desc)
  where kind in ('temp', 'med');
