-- Allow marking one watcher per item as the "chosen" candidate (the one we
-- intend to actually purchase) and let users hand-sort the watcher list by
-- preference. Watchers conceptually become candidates for the same gear
-- item — same plumbing already powers price tracking.

alter table public.gear_watchers
  add column if not exists is_chosen boolean not null default false,
  add column if not exists sort_order integer not null default 0;

-- Backfill sort_order per item by creation order so existing rows have a
-- stable initial ordering.
update public.gear_watchers w
set sort_order = sub.rn
from (
  select id,
         row_number() over (partition by item_id order by created_at, id) as rn
  from public.gear_watchers
) sub
where w.id = sub.id;

-- Only one chosen watcher per item.
create unique index if not exists gear_watchers_chosen_unique
  on public.gear_watchers(item_id)
  where is_chosen;

-- Speed up the per-item sorted read.
create index if not exists gear_watchers_item_sort_idx
  on public.gear_watchers(item_id, sort_order);
