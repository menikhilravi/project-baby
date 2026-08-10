-- Questions for the pediatrician: the running list a parent builds up between
-- visits ("is this rash normal?", "when do we start solids?") and ticks off
-- during the appointment. It's the half of the visit summary that the app
-- can't compute — the other half is derived from baby_events.
--
-- Couple-scoped like appointments / baby_events: either partner adds, both
-- see the same list, and whoever is in the exam room ticks them off.

create table if not exists public.visit_questions (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  couple_id uuid references public.couples,
  question text not null,
  -- Set when the question was actually asked at a visit. Null = still open.
  -- Nullable-timestamp rather than a boolean so the summary can scope
  -- "asked since the last visit" to a window like every other metric.
  asked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists visit_questions_couple_idx
  on public.visit_questions(couple_id, created_at desc);
create index if not exists visit_questions_user_idx
  on public.visit_questions(user_id, created_at desc);

alter table public.visit_questions enable row level security;

drop policy if exists "visit_questions couple" on public.visit_questions;
create policy "visit_questions couple" on public.visit_questions
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
