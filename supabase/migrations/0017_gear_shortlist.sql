-- Split gear into two flavors:
--   - 'registry'  (existing): one product, many retailer URLs for price tracking
--   - 'shortlist' (new):      one need (e.g. "Dresser"), many product candidates
--                             to choose between. Watcher URLs are the candidates;
--                             starring marks the one we've decided on.
-- A shortlist (or registry) item may optionally point back at the nursery
-- checklist row that spawned it.

-- 1. Extend the kind check to include 'shortlist'.
alter table public.gear_items
  drop constraint if exists gear_items_kind_check;
alter table public.gear_items
  add constraint gear_items_kind_check
  check (kind in ('registry', 'supplies', 'shortlist'));

-- 2. Optional link back to the nursery checklist row that spawned this gear
--    item. ON DELETE SET NULL so deleting a nursery row doesn't cascade.
alter table public.gear_items
  add column if not exists nursery_item_id bigint
    references public.nursery_checklist on delete set null;

create index if not exists gear_items_nursery_idx
  on public.gear_items(nursery_item_id)
  where nursery_item_id is not null;

-- 3. Recreate the view so SELECT * picks up the new column. Postgres
--    materializes column lists at view-creation time, so adding a column to
--    the underlying table doesn't auto-propagate. CREATE OR REPLACE can't
--    shift existing columns' positions (it errors with "cannot change name
--    of view column …"), so we drop and re-create.
drop view if exists public.gear_items_with_best;
create view public.gear_items_with_best as
select
  i.*,
  (
    select min(current_price)
    from public.gear_watchers w
    where w.item_id = i.id
      and w.is_paused = false
      and w.current_price is not null
  ) as best_price,
  (
    select max(price)
    from public.gear_price_history h
    join public.gear_watchers w on w.id = h.watcher_id
    where w.item_id = i.id
  ) as high_price,
  (
    select count(*)
    from public.gear_watchers w
    where w.item_id = i.id
  )::int as watcher_count
from public.gear_items i;
