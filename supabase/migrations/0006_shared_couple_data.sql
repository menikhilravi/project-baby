-- NB-1 extension: make gear and hospital data shared between couple members.
-- Adds couple_id to gear_items and hospital_checklist, then replaces per-user
-- RLS policies with couple-aware ones. Pages already query without user_id
-- filters so they automatically show shared data once RLS is updated.

alter table public.gear_items
  add column if not exists couple_id uuid references public.couples;

alter table public.hospital_checklist
  add column if not exists couple_id uuid references public.couples;

-- ── gear_items ────────────────────────────────────────────────────────────────
drop policy if exists "gear_items all self" on public.gear_items;
create policy "gear_items couple" on public.gear_items
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

-- ── gear_watchers ─────────────────────────────────────────────────────────────
drop policy if exists "gear_watchers all via item" on public.gear_watchers;
create policy "gear_watchers couple via item" on public.gear_watchers
  for all to authenticated
  using (
    exists (
      select 1 from public.gear_items i
      where i.id = gear_watchers.item_id
        and (
          i.user_id = auth.uid()
          or (i.couple_id is not null
              and i.couple_id = (select couple_id from public.profiles where id = auth.uid()))
        )
    )
  )
  with check (
    exists (
      select 1 from public.gear_items i
      where i.id = gear_watchers.item_id
        and (
          i.user_id = auth.uid()
          or (i.couple_id is not null
              and i.couple_id = (select couple_id from public.profiles where id = auth.uid()))
        )
    )
  );

-- ── gear_price_history ────────────────────────────────────────────────────────
drop policy if exists "gear_price_history select via watcher" on public.gear_price_history;
create policy "gear_price_history couple via watcher" on public.gear_price_history
  for select to authenticated
  using (
    exists (
      select 1 from public.gear_watchers w
      join public.gear_items i on i.id = w.item_id
      where w.id = gear_price_history.watcher_id
        and (
          i.user_id = auth.uid()
          or (i.couple_id is not null
              and i.couple_id = (select couple_id from public.profiles where id = auth.uid()))
        )
    )
  );

-- ── hospital_checklist ────────────────────────────────────────────────────────
drop policy if exists "hospital_checklist all self" on public.hospital_checklist;
create policy "hospital_checklist couple" on public.hospital_checklist
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
