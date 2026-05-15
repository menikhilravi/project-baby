-- Kick counter: pregnant user taps a button each time they feel a kick.
-- Reuse baby_events with a new `kind='kick'`. Sessions (contiguous runs of
-- kicks with no gap > 2 hours) are derived on read, not stored.

-- 1. Extend the kind check to include 'kick'.
alter table public.baby_events
  drop constraint if exists baby_events_kind_check;
alter table public.baby_events
  add constraint baby_events_kind_check
  check (kind in ('feed', 'diaper', 'sleep', 'kick'));

-- 2. Hot-path index for "kicks in the last N hours" / "kicks per day" queries.
create index if not exists baby_events_kicks_idx
  on public.baby_events(couple_id, occurred_at desc)
  where kind = 'kick';

-- 3. Derived sessions for the couple. A new session begins whenever the
--    gap from the previous kick exceeds 2 hours. `reached_ten_at` is set
--    to the 10th kick's timestamp if that count was reached, else null.
--
--    Couple-scoped (same as baby_events RLS); solo users pass null
--    p_couple_id and we fall back to p_user_id.
create or replace function public.kick_sessions_for_couple(
  p_couple_id uuid,
  p_user_id uuid,
  p_since timestamptz
)
returns table (
  session_start timestamptz,
  session_end timestamptz,
  kick_count int,
  reached_ten_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with kicks as (
    select occurred_at
    from public.baby_events
    where kind = 'kick'
      and occurred_at >= p_since
      and (
        (p_couple_id is not null and couple_id = p_couple_id)
        or (p_couple_id is null and user_id = p_user_id)
      )
  ),
  marked as (
    select
      occurred_at,
      case
        when lag(occurred_at) over (order by occurred_at) is null
          or occurred_at - lag(occurred_at) over (order by occurred_at)
             > interval '2 hours'
        then 1 else 0
      end as is_new_session
    from kicks
  ),
  grouped as (
    select
      occurred_at,
      sum(is_new_session) over (order by occurred_at) as session_id
    from marked
  ),
  numbered as (
    select
      session_id,
      occurred_at,
      row_number() over (partition by session_id order by occurred_at) as n
    from grouped
  )
  select
    min(occurred_at) as session_start,
    max(occurred_at) as session_end,
    count(*)::int as kick_count,
    max(occurred_at) filter (where n = 10) as reached_ten_at
  from numbered
  group by session_id
  order by session_start desc;
$$;

revoke all on function public.kick_sessions_for_couple(uuid, uuid, timestamptz)
  from public;
grant execute on function public.kick_sessions_for_couple(uuid, uuid, timestamptz)
  to authenticated;
