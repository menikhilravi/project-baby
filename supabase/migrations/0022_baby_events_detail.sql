-- Richer logging: capture diaper type (pee/poop/both) and feed detail
-- (breast side / bottle amount / solid). Additive and back-compatible —
-- existing rows keep null detail and the single-tap flow still works.

alter table public.baby_events
  add column if not exists subtype text,
  add column if not exists amount numeric,
  add column if not exists unit text;

-- Allowed subtypes per kind (null always allowed = a typeless quick-tap):
--   diaper -> pee | poop | both
--   feed   -> left | right | bottle | solid
-- sleep/kick never carry a subtype.
alter table public.baby_events
  drop constraint if exists baby_events_subtype_check;
alter table public.baby_events
  add constraint baby_events_subtype_check
  check (
    subtype is null
    or (kind = 'diaper' and subtype in ('pee', 'poop', 'both'))
    or (kind = 'feed' and subtype in ('left', 'right', 'bottle', 'solid'))
  );

alter table public.baby_events
  drop constraint if exists baby_events_unit_check;
alter table public.baby_events
  add constraint baby_events_unit_check
  check (unit is null or unit in ('oz', 'ml'));
