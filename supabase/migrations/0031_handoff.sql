-- Sitter / handoff mode: a glanceable "here's where things are" screen for a
-- grandparent or babysitter. The live status is composed from existing
-- baby_events; these profile columns hold the static info a caregiver needs.

alter table public.profiles
  add column if not exists care_instructions text,
  add column if not exists pediatrician_name text,
  add column if not exists pediatrician_phone text,
  -- Array of { label, phone } contacts, e.g. [{"label":"Mom","phone":"..."}].
  add column if not exists emergency_contacts jsonb not null default '[]'::jsonb;
