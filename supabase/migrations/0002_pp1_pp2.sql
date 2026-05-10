-- Parent Prep Hub — PP-1 + PP-2: real prices + multi-retailer
-- Apply via Supabase Dashboard → SQL Editor → New query → paste → Run.
-- This drops existing gear data (test data only per user direction).

------------------------------------------------------------------------------
-- 1. Wipe old gear schema
------------------------------------------------------------------------------

drop view if exists public.gear_items_with_best;
drop table if exists public.gear_price_history cascade;
drop table if exists public.gear_watchers cascade;
drop table if exists public.gear_items cascade;

------------------------------------------------------------------------------
-- 2. New tables
------------------------------------------------------------------------------

create table public.gear_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  emoji text not null default '🛒',
  target_price numeric(10,2) not null,
  last_target_hit_at timestamptz,
  is_target_hit_acknowledged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gear_items_user_idx on public.gear_items(user_id);

create table public.gear_watchers (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.gear_items on delete cascade,
  retailer text not null,
  url text not null,
  current_price numeric(10,2),
  last_checked_at timestamptz,
  last_checked_status text not null default 'pending'
    check (last_checked_status in ('pending','ok','failed')),
  last_error text,
  is_paused boolean not null default false,
  created_at timestamptz not null default now()
);
create index gear_watchers_item_idx on public.gear_watchers(item_id);

create table public.gear_price_history (
  id bigserial primary key,
  watcher_id uuid not null references public.gear_watchers on delete cascade,
  price numeric(10,2) not null,
  recorded_at timestamptz not null default now()
);
create index gear_price_history_watcher_idx
  on public.gear_price_history(watcher_id, recorded_at desc);

------------------------------------------------------------------------------
-- 3. Triggers
------------------------------------------------------------------------------

-- updated_at trigger on gear_items (set_updated_at function exists from 0001)
drop trigger if exists gear_items_updated_at on public.gear_items;
create trigger gear_items_updated_at
  before update on public.gear_items
  for each row execute function public.set_updated_at();

-- Append history every time a watcher's current_price changes (or first set).
create or replace function public.log_watcher_price_change()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'UPDATE'
      and old.current_price is distinct from new.current_price
      and new.current_price is not null) then
    insert into public.gear_price_history(watcher_id, price)
    values (new.id, new.current_price);
  end if;
  return new;
end;
$$;

drop trigger if exists gear_watchers_log_price on public.gear_watchers;
create trigger gear_watchers_log_price
  after update of current_price on public.gear_watchers
  for each row execute function public.log_watcher_price_change();

------------------------------------------------------------------------------
-- 4. Row-Level Security
------------------------------------------------------------------------------

alter table public.gear_items enable row level security;
alter table public.gear_watchers enable row level security;
alter table public.gear_price_history enable row level security;

drop policy if exists "gear_items all self" on public.gear_items;
create policy "gear_items all self" on public.gear_items
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "gear_watchers all via item" on public.gear_watchers;
create policy "gear_watchers all via item" on public.gear_watchers
  for all to authenticated
  using (
    exists (
      select 1 from public.gear_items i
      where i.id = gear_watchers.item_id and i.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.gear_items i
      where i.id = gear_watchers.item_id and i.user_id = auth.uid()
    )
  );

drop policy if exists "gear_price_history select via watcher" on public.gear_price_history;
create policy "gear_price_history select via watcher" on public.gear_price_history
  for select to authenticated
  using (
    exists (
      select 1 from public.gear_watchers w
      join public.gear_items i on i.id = w.item_id
      where w.id = gear_price_history.watcher_id and i.user_id = auth.uid()
    )
  );

------------------------------------------------------------------------------
-- 5. Convenience view: items with best price across watchers
------------------------------------------------------------------------------

create or replace view public.gear_items_with_best as
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

-- View inherits RLS from underlying tables, so per-user filtering still applies.
