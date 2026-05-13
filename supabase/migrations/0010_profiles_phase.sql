-- Phase awareness: prenatal vs postnatal.
-- birth_date is the auto signal; phase_override lets the user pin it manually.

alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists phase_override text
    check (phase_override in ('prenatal', 'postnatal'));
