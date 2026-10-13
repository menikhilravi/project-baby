-- UI revamp: the baby gets a name in the header, and the app accent follows
-- the baby.
--   * baby_name   — shown in the app header / Today greeting. Couple-shared.
--   * baby_accent — per-user override of the accent hue. NULL = derive from
--                   baby_sex (male → boy, female → girl, unknown → neutral).
--
-- baby_sex was documented as couple-shared (0026) but every write only touched
-- the caller's row, so partners could disagree on which WHO curves to use. The
-- two setters below write every profile in the caller's couple.

alter table public.profiles
  add column if not exists baby_name text
    check (baby_name is null or char_length(baby_name) between 1 and 40),
  add column if not exists baby_accent text
    check (baby_accent is null or baby_accent in ('neutral', 'boy', 'girl'));

create or replace function public.set_couple_baby_sex(p_sex text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_sex is not null and p_sex not in ('male', 'female') then
    raise exception 'invalid sex';
  end if;
  select couple_id into v_couple from public.profiles where id = auth.uid();
  update public.profiles
    set baby_sex = p_sex
    where id = auth.uid()
       or (v_couple is not null and couple_id = v_couple);
end;
$$;

create or replace function public.set_couple_baby_name(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple uuid;
  v_name text := nullif(btrim(p_name), '');
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select couple_id into v_couple from public.profiles where id = auth.uid();
  update public.profiles
    set baby_name = v_name
    where id = auth.uid()
       or (v_couple is not null and couple_id = v_couple);
end;
$$;

revoke all on function public.set_couple_baby_sex(text) from public;
revoke all on function public.set_couple_baby_name(text) from public;
grant execute on function public.set_couple_baby_sex(text) to authenticated;
grant execute on function public.set_couple_baby_name(text) to authenticated;
