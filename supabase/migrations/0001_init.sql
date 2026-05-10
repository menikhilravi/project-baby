-- Parent Prep Hub — initial schema
-- Apply via Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Idempotent: safe to re-run.

------------------------------------------------------------------------------
-- 1. Tables
------------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.gear_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  retailer text,
  url text,
  emoji text not null default '🛒',
  current_price numeric(10,2) not null,
  target_price numeric(10,2) not null,
  high_price numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gear_items_user_idx on public.gear_items(user_id);

create table if not exists public.gear_price_history (
  id bigserial primary key,
  item_id uuid not null references public.gear_items on delete cascade,
  price numeric(10,2) not null,
  recorded_at timestamptz not null default now()
);
create index if not exists gear_price_history_item_idx
  on public.gear_price_history(item_id, recorded_at desc);

create table if not exists public.name_swipes (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  verdict text not null check (verdict in ('like','pass')),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists name_swipes_user_idx on public.name_swipes(user_id);

create table if not exists public.hospital_checklist (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  owner text not null check (owner in ('mom','dad','baby')),
  item text not null,
  checked boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, owner, item)
);
create index if not exists hospital_checklist_user_idx
  on public.hospital_checklist(user_id);

create table if not exists public.cards (
  id text primary key,
  name text not null,
  issuer text not null,
  network text not null,
  base_multiplier numeric(3,1) not null default 1.0,
  point_value_cents numeric(4,2) not null default 1.0
);

create table if not exists public.card_categories (
  card_id text not null references public.cards on delete cascade,
  category text not null,
  multiplier numeric(3,1) not null,
  primary key (card_id, category)
);
create index if not exists card_categories_category_idx
  on public.card_categories(category);

------------------------------------------------------------------------------
-- 2. Triggers
------------------------------------------------------------------------------

-- 2a. Mirror new auth.users → public.profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2b. updated_at on gear_items
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists gear_items_updated_at on public.gear_items;
create trigger gear_items_updated_at
  before update on public.gear_items
  for each row execute function public.set_updated_at();

-- 2c. Append price history when current_price changes (or on insert)
create or replace function public.log_gear_price_change()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.gear_price_history(item_id, price)
    values (new.id, new.current_price);
  elsif (tg_op = 'UPDATE' and old.current_price is distinct from new.current_price) then
    insert into public.gear_price_history(item_id, price)
    values (new.id, new.current_price);
  end if;
  return new;
end;
$$;

drop trigger if exists gear_items_log_price on public.gear_items;
create trigger gear_items_log_price
  after insert or update of current_price on public.gear_items
  for each row execute function public.log_gear_price_change();

------------------------------------------------------------------------------
-- 3. Row-Level Security
------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.gear_items enable row level security;
alter table public.gear_price_history enable row level security;
alter table public.name_swipes enable row level security;
alter table public.hospital_checklist enable row level security;
alter table public.cards enable row level security;
alter table public.card_categories enable row level security;

-- profiles: each user sees + edits only their own row
drop policy if exists "profiles select self" on public.profiles;
create policy "profiles select self" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- gear_items: per-user CRUD
drop policy if exists "gear_items all self" on public.gear_items;
create policy "gear_items all self" on public.gear_items
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- gear_price_history: read your own (via item ownership)
drop policy if exists "gear_price_history select own" on public.gear_price_history;
create policy "gear_price_history select own" on public.gear_price_history
  for select to authenticated using (
    exists (
      select 1 from public.gear_items g
      where g.id = gear_price_history.item_id and g.user_id = auth.uid()
    )
  );
-- Inserts happen via trigger (security definer), so no insert policy is needed
-- for client-side writes. We deliberately DO NOT grant insert/update/delete.

-- name_swipes: per-user CRUD
drop policy if exists "name_swipes all self" on public.name_swipes;
create policy "name_swipes all self" on public.name_swipes
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- hospital_checklist: per-user CRUD
drop policy if exists "hospital_checklist all self" on public.hospital_checklist;
create policy "hospital_checklist all self" on public.hospital_checklist
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- cards / card_categories: read-only reference data (anyone authed can SELECT)
drop policy if exists "cards select all" on public.cards;
create policy "cards select all" on public.cards
  for select to authenticated using (true);

drop policy if exists "card_categories select all" on public.card_categories;
create policy "card_categories select all" on public.card_categories
  for select to authenticated using (true);

------------------------------------------------------------------------------
-- 4. Seed: ~10 popular cards + category multipliers
------------------------------------------------------------------------------

insert into public.cards (id, name, issuer, network, base_multiplier, point_value_cents)
values
  ('chase-sapphire-preferred', 'Chase Sapphire Preferred', 'Chase', 'visa', 1.0, 1.25),
  ('chase-sapphire-reserve', 'Chase Sapphire Reserve', 'Chase', 'visa', 1.0, 1.50),
  ('chase-freedom-unlimited', 'Chase Freedom Unlimited', 'Chase', 'visa', 1.5, 1.00),
  ('amex-gold', 'American Express Gold', 'American Express', 'amex', 1.0, 1.00),
  ('amex-platinum', 'American Express Platinum', 'American Express', 'amex', 1.0, 1.00),
  ('amex-blue-cash-preferred', 'Blue Cash Preferred', 'American Express', 'amex', 1.0, 1.00),
  ('citi-custom-cash', 'Citi Custom Cash', 'Citi', 'mastercard', 1.0, 1.00),
  ('citi-double-cash', 'Citi Double Cash', 'Citi', 'mastercard', 2.0, 1.00),
  ('capital-one-venture-x', 'Capital One Venture X', 'Capital One', 'visa', 2.0, 1.00),
  ('discover-it-cash-back', 'Discover it Cash Back', 'Discover', 'discover', 1.0, 1.00),
  ('apple-card', 'Apple Card', 'Goldman Sachs', 'mastercard', 1.0, 1.00)
on conflict (id) do update set
  name = excluded.name,
  issuer = excluded.issuer,
  network = excluded.network,
  base_multiplier = excluded.base_multiplier,
  point_value_cents = excluded.point_value_cents;

-- Wipe and re-seed category rules so this migration is idempotent.
delete from public.card_categories where card_id in (
  'chase-sapphire-preferred','chase-sapphire-reserve','chase-freedom-unlimited',
  'amex-gold','amex-platinum','amex-blue-cash-preferred',
  'citi-custom-cash','citi-double-cash',
  'capital-one-venture-x','discover-it-cash-back','apple-card'
);

insert into public.card_categories (card_id, category, multiplier) values
  -- Chase Sapphire Preferred
  ('chase-sapphire-preferred', 'dining', 3.0),
  ('chase-sapphire-preferred', 'online_groceries', 3.0),
  ('chase-sapphire-preferred', 'streaming', 3.0),
  ('chase-sapphire-preferred', 'travel', 2.0),
  -- Chase Sapphire Reserve
  ('chase-sapphire-reserve', 'dining', 3.0),
  ('chase-sapphire-reserve', 'travel', 3.0),
  -- Chase Freedom Unlimited
  ('chase-freedom-unlimited', 'dining', 3.0),
  ('chase-freedom-unlimited', 'drugstores', 3.0),
  ('chase-freedom-unlimited', 'travel', 5.0),
  -- Amex Gold
  ('amex-gold', 'dining', 4.0),
  ('amex-gold', 'groceries', 4.0),
  ('amex-gold', 'flights', 3.0),
  -- Amex Platinum
  ('amex-platinum', 'flights', 5.0),
  ('amex-platinum', 'hotels', 5.0),
  -- Amex Blue Cash Preferred
  ('amex-blue-cash-preferred', 'groceries', 6.0),
  ('amex-blue-cash-preferred', 'streaming', 6.0),
  ('amex-blue-cash-preferred', 'transit', 3.0),
  ('amex-blue-cash-preferred', 'gas', 3.0),
  -- Citi Custom Cash (max 5x in top-spend category — model conservatively)
  ('citi-custom-cash', 'dining', 5.0),
  ('citi-custom-cash', 'groceries', 5.0),
  ('citi-custom-cash', 'gas', 5.0),
  ('citi-custom-cash', 'streaming', 5.0),
  -- Capital One Venture X
  ('capital-one-venture-x', 'hotels', 10.0),
  ('capital-one-venture-x', 'flights', 5.0),
  -- Discover it Cash Back (rotating; model commonly-rotated cats at 5x)
  ('discover-it-cash-back', 'amazon', 5.0),
  ('discover-it-cash-back', 'gas', 5.0),
  ('discover-it-cash-back', 'groceries', 5.0),
  -- Apple Card
  ('apple-card', 'apple', 3.0)
on conflict (card_id, category) do update set multiplier = excluded.multiplier;
