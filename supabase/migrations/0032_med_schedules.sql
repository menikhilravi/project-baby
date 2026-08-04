-- Scheduled medicine reminders: "Vitamin D at 9:00", "gas drops at 14:00 and
-- 20:00". Couple-scoped like baby_events, so either partner sees the same
-- schedule and both devices get nudged. Read by /api/cron/care-reminder
-- alongside the existing feed/diaper rules, and by the /today Medicine card
-- to show what's due.
--
-- Times are stored as local wall-clock 'HH:MM' strings, not timestamps: a 9am
-- dose should fire at 9am wherever the family is. The cron resolves them
-- against the IANA timezone captured on the push subscription (0021).

create table if not exists public.med_schedules (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  couple_id uuid references public.couples,
  -- Which medicine — mirrors the baby_events med subtypes (0025).
  subtype text not null check (
    subtype in ('vitamin_d', 'tylenol', 'gas_drops', 'probiotic', 'other')
  ),
  -- Optional custom name, mainly so subtype='other' can read as itself.
  label text,
  -- Local 24h 'HH:MM' times, e.g. {'09:00','20:00'}. Empty = no reminders.
  times text[] not null default '{}',
  -- Dose to pre-fill when logging from a reminder.
  amount numeric,
  unit text check (unit is null or unit in ('iu', 'mg', 'ml')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists med_schedules_couple_idx
  on public.med_schedules(couple_id);
create index if not exists med_schedules_user_idx
  on public.med_schedules(user_id);

alter table public.med_schedules enable row level security;

-- Same couple-or-owner visibility as baby_events (0009).
drop policy if exists "med_schedules couple" on public.med_schedules;
create policy "med_schedules couple" on public.med_schedules
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

-- De-dup state reuses care_reminder_state (0028) with kind = 'med:<schedule_id>'
-- and last_ref = '<local-date>T<HH:MM>', so each scheduled slot nudges once.
alter table public.care_reminder_state
  drop constraint if exists care_reminder_state_kind_check;
alter table public.care_reminder_state
  add constraint care_reminder_state_kind_check
  check (kind in ('feed', 'diaper') or kind like 'med:%');

-- Rows for a deleted schedule would otherwise linger forever.
create or replace function public.prune_med_reminder_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.care_reminder_state
    where kind = 'med:' || old.id::text;
  return old;
end;
$$;

drop trigger if exists med_schedules_prune_state on public.med_schedules;
create trigger med_schedules_prune_state
  after delete on public.med_schedules
  for each row execute function public.prune_med_reminder_state();
