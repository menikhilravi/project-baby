-- Knowledge Base: shared notes/documents (pediatrician info, dosages, etc.)

create table if not exists public.notes (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  couple_id uuid references public.couples,
  title text not null,
  body text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_couple_idx
  on public.notes(couple_id, pinned desc, updated_at desc);
create index if not exists notes_user_idx
  on public.notes(user_id, pinned desc, updated_at desc);

-- Trigram-style search on title+body via simple ilike — fast enough for KB scale.
create index if not exists notes_title_lower_idx
  on public.notes(lower(title));

alter table public.notes enable row level security;

drop policy if exists "notes couple" on public.notes;
create policy "notes couple" on public.notes
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
