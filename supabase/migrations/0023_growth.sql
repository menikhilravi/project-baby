-- Growth tracking: weight / height / head circumference over time.
-- Couple-scoped like baby_events (both partners see & edit the same baby).

create table if not exists public.growth_measurements (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  couple_id uuid references public.couples,
  measured_on date not null default current_date,
  weight_g numeric,
  height_cm numeric,
  head_cm numeric,
  created_at timestamptz not null default now()
);

create index if not exists growth_couple_idx
  on public.growth_measurements(couple_id, measured_on desc);
create index if not exists growth_user_idx
  on public.growth_measurements(user_id, measured_on desc);

alter table public.growth_measurements enable row level security;

drop policy if exists "growth couple" on public.growth_measurements;
create policy "growth couple" on public.growth_measurements
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
