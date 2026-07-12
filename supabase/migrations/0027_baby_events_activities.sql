-- More postnatal activities on baby_events:
--   * kind='pump'      — expressed milk (amount + unit, subtype = which breast).
--   * kind='tummy'     — a tummy-time session (occurred_at → ended_at duration).
--   * kind='milestone' — a "first" (label + date in notes/occurred_at).

-- 1. Extend the kind check.
alter table public.baby_events
  drop constraint if exists baby_events_kind_check;
alter table public.baby_events
  add constraint baby_events_kind_check
  check (kind in (
    'feed', 'diaper', 'sleep', 'kick', 'contraction',
    'temp', 'med', 'pump', 'tummy', 'milestone'
  ));

-- 2. Pump carries a breast subtype; milestone/tummy carry none (label lives in
--    notes for milestones). Keep the existing diaper/feed/med subtype rules.
alter table public.baby_events
  drop constraint if exists baby_events_subtype_check;
alter table public.baby_events
  add constraint baby_events_subtype_check
  check (
    subtype is null
    or (kind = 'diaper' and subtype in ('pee', 'poop', 'both'))
    or (kind = 'feed' and subtype in ('left', 'right', 'bottle', 'solid'))
    or (kind = 'med' and subtype in ('vitamin_d', 'tylenol', 'gas_drops', 'probiotic', 'other'))
    or (kind = 'pump' and subtype in ('left', 'right', 'both'))
  );

-- 3. Hot-path index for the activity reads (tummy today, recent milestones).
create index if not exists baby_events_activity_idx
  on public.baby_events(couple_id, occurred_at desc)
  where kind in ('pump', 'tummy', 'milestone');
