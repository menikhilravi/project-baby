-- Essentials: gear_items now covers both Registry (one-time, price-tracked)
-- and Supplies (consumables with quantity + low-stock threshold).
--
-- Existing rows backfill as 'registry' via the default.

alter table public.gear_items
  add column if not exists kind text not null default 'registry'
    check (kind in ('registry', 'supplies')),
  add column if not exists quantity int not null default 0,
  add column if not exists low_threshold int not null default 0;

-- target_price was required; supplies don't have one. Allow null so supplies
-- inserts don't have to pass a meaningless 0.
alter table public.gear_items
  alter column target_price drop not null;

create index if not exists gear_items_kind_idx
  on public.gear_items(couple_id, kind);
