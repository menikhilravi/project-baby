-- Parent Prep Hub — NB-4: LLM-generated Telugu names
-- Stores names the LLM (Gemini) produced for a specific user, so the
-- generator can avoid repeats and so the deck has instant pages on re-render.

create table if not exists public.generated_names (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  origin text not null,
  meaning text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists generated_names_user_idx
  on public.generated_names(user_id, created_at desc);

alter table public.generated_names enable row level security;

drop policy if exists "generated_names all self" on public.generated_names;
create policy "generated_names all self" on public.generated_names
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
