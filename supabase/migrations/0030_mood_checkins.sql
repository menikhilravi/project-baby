-- Postpartum mood check-ins (EPDS). Unlike baby data, these are PERSONAL to the
-- parent who took them — mental-health screening is private, and each partner
-- screens independently. So this table is user-scoped only (no couple sharing).

create table if not exists public.mood_checkins (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  taken_on date not null default current_date,
  -- Total EPDS score, 0–30.
  score integer not null,
  -- The 10 item scores (each 0–3), in order.
  answers integer[] not null,
  -- Item 10 (self-harm) score, mirrored out for easy safety surfacing.
  self_harm integer not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists mood_checkins_user_idx
  on public.mood_checkins(user_id, taken_on desc);

alter table public.mood_checkins enable row level security;

drop policy if exists "mood_checkins own" on public.mood_checkins;
create policy "mood_checkins own" on public.mood_checkins
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
