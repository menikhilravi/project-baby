create table if not exists public.nursery_checklist (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  couple_id uuid references public.couples,
  owner text not null check (owner in ('room','safety','supplies')),
  item text not null,
  checked boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, owner, item)
);

create index on public.nursery_checklist (user_id);
create index on public.nursery_checklist (couple_id);

alter table public.nursery_checklist enable row level security;

create policy "nursery_checklist couple" on public.nursery_checklist
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
