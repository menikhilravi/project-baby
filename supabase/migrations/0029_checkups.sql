-- Checkups: well-baby visits + immunization doses.
-- Couple-scoped like baby_events / growth_measurements (both partners see & edit
-- the same baby). Two tables:
--   * appointments   — scheduled visits (well-baby or ad-hoc), with a done flag.
--   * vaccine_doses  — a recorded dose against a schedule code (e.g. dtap #1).

create table if not exists public.appointments (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  couple_id uuid references public.couples,
  -- Free-form slug of the visit type, e.g. 'well_2mo' or 'custom'.
  slug text,
  title text not null,
  scheduled_for timestamptz not null,
  location text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists appointments_couple_idx
  on public.appointments(couple_id, scheduled_for);
create index if not exists appointments_user_idx
  on public.appointments(user_id, scheduled_for);

create table if not exists public.vaccine_doses (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  couple_id uuid references public.couples,
  -- Vaccine code from the reference schedule, e.g. 'hepb', 'dtap', 'pcv13'.
  vaccine text not null,
  -- Which dose in the series, e.g. '1', '2', 'booster'.
  dose text not null,
  given_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  -- One row per couple (or solo user) + vaccine + dose.
  unique (couple_id, vaccine, dose),
  unique (user_id, vaccine, dose)
);

create index if not exists vaccine_doses_couple_idx
  on public.vaccine_doses(couple_id, given_on desc);
create index if not exists vaccine_doses_user_idx
  on public.vaccine_doses(user_id, given_on desc);

alter table public.appointments enable row level security;
alter table public.vaccine_doses enable row level security;

drop policy if exists "appointments couple" on public.appointments;
create policy "appointments couple" on public.appointments
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

drop policy if exists "vaccine_doses couple" on public.vaccine_doses;
create policy "vaccine_doses couple" on public.vaccine_doses
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
