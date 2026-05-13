-- Night Shift Logger: shared, realtime log of feed / diaper / sleep events.
-- Couple-scoped like gear_items and hospital_checklist.

create table if not exists public.baby_events (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  couple_id uuid references public.couples,
  kind text not null check (kind in ('feed', 'diaper', 'sleep')),
  occurred_at timestamptz not null default now(),
  -- only set for kind='sleep' once the session ends; null = ongoing
  ended_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists baby_events_couple_idx
  on public.baby_events(couple_id, occurred_at desc);
create index if not exists baby_events_user_idx
  on public.baby_events(user_id, occurred_at desc);

-- One open sleep session at a time per couple keeps the toggle logic safe.
create unique index if not exists baby_events_one_open_sleep
  on public.baby_events(couple_id)
  where kind = 'sleep' and ended_at is null and couple_id is not null;
create unique index if not exists baby_events_one_open_sleep_solo
  on public.baby_events(user_id)
  where kind = 'sleep' and ended_at is null and couple_id is null;

alter table public.baby_events enable row level security;

drop policy if exists "baby_events couple" on public.baby_events;
create policy "baby_events couple" on public.baby_events
  for all to authenticated
  using (
    user_id = auth.uid()
    or (couple_id is not null
        and couple_id = (select couple_id from public.profiles where id = auth.uid()))
  )
  with check (
    user_id = auth.uid()
    or (couple_id is not null
        and couple_id = (select couple_id from public.profiles where id = auth.uid()))
  );

-- Enable Supabase Realtime broadcasts for this table.
alter publication supabase_realtime add table public.baby_events;
