-- NB-2: add rank column to name_swipes for user-defined ordering of liked names.
-- rank is NULL for passed names; 1-based integer for liked names (1 = top of list).

alter table public.name_swipes
  add column if not exists rank integer;

-- Backfill existing liked rows: assign 1..N ordered by created_at asc per user.
update public.name_swipes ns
set rank = sub.rn
from (
  select id,
         row_number() over (partition by user_id order by created_at asc) as rn
  from public.name_swipes
  where verdict = 'like'
) sub
where ns.id = sub.id;
