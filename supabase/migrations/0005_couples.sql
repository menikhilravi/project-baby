-- NB-1: couple mode — shared name pool, both partners' verdicts visible.

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists couple_id uuid references public.couples;

-- RLS: members can read their own couple row; anyone authed can insert (to create one).
alter table public.couples enable row level security;

drop policy if exists "couples read member" on public.couples;
create policy "couples read member" on public.couples
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles where id = auth.uid() and couple_id = couples.id
    )
  );

drop policy if exists "couples insert" on public.couples;
create policy "couples insert" on public.couples
  for insert to authenticated with check (true);
