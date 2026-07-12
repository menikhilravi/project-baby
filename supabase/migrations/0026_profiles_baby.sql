-- Baby profile facts used by the growth + birth-weight-recovery views.
--   * baby_sex     — drives the correct WHO percentile curves. Previously kept
--                    in localStorage (per-device, unshared); now couple-shared.
--   * birth_weight_g — the baseline for the first-2-week weight-recovery view
--                    (newborns lose 7–10% and should regain by ~day 14).

alter table public.profiles
  add column if not exists baby_sex text
    check (baby_sex is null or baby_sex in ('male', 'female')),
  add column if not exists birth_weight_g numeric;
