-- Web push subscriptions per user device. A single user can have multiple
-- rows (phone + laptop + tablet). The endpoint URL is unique per device.
-- p256dh / auth are the keys returned by the browser PushManager that the
-- web-push library needs to encrypt outgoing payloads.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Users can only see/manage their own subscriptions.
create policy "push_subscriptions own" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
