-- Migration 003: Professional polish upgrade
-- Safe for an already-running production database.
-- Run in Supabase SQL Editor after migrations 001 (multi-couple) and any prior schema.
-- Idempotent: safe to run more than once.

-- ── 1. Thoughts & Testimonies ───────────────────────────────────────────────

create table if not exists public.thoughts_testimonies (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.thoughts_testimonies enable row level security;

drop policy if exists "thoughts_select" on public.thoughts_testimonies;
drop policy if exists "thoughts_insert" on public.thoughts_testimonies;
drop policy if exists "thoughts_update" on public.thoughts_testimonies;
drop policy if exists "thoughts_delete" on public.thoughts_testimonies;

create policy "thoughts_select" on public.thoughts_testimonies
  for select using (couple_id = public.user_couple_id());

create policy "thoughts_insert" on public.thoughts_testimonies
  for insert with check (
    auth.uid() = user_id
    and couple_id = public.user_couple_id()
  );

create policy "thoughts_update" on public.thoughts_testimonies
  for update using (
    auth.uid() = user_id
    and couple_id = public.user_couple_id()
  );

create policy "thoughts_delete" on public.thoughts_testimonies
  for delete using (
    auth.uid() = user_id
    and couple_id = public.user_couple_id()
  );

create index if not exists idx_thoughts_couple
  on public.thoughts_testimonies (couple_id, created_at desc);

-- ── 2. Push subscription support (JSON + user agent) ────────────────────────
-- Allows the app to store full PushSubscription JSON alongside legacy p256dh/auth.

alter table public.push_subscriptions
  add column if not exists subscription jsonb;

alter table public.push_subscriptions
  add column if not exists user_agent text default '';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'push_subscriptions'
      and column_name = 'p256dh'
      and is_nullable = 'NO'
  ) then
    alter table public.push_subscriptions alter column p256dh drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'push_subscriptions'
      and column_name = 'auth'
      and is_nullable = 'NO'
  ) then
    alter table public.push_subscriptions alter column auth drop not null;
  end if;
end $$;

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id, endpoint);

-- ── 3. Morning reminder deduplication log ───────────────────────────────────
-- Used by the /api/cron/morning-reminder job to avoid duplicate weekday pushes.

create table if not exists public.morning_reminder_log (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reminder_date date not null,
  sent_at timestamptz default now(),
  unique (user_id, reminder_date)
);

alter table public.morning_reminder_log enable row level security;

-- No client policies: only the service-role cron job writes/reads this table.

create index if not exists idx_morning_reminder_log_date
  on public.morning_reminder_log (reminder_date, user_id);

create index if not exists idx_morning_reminder_log_couple
  on public.morning_reminder_log (couple_id, reminder_date);

-- ── 4. Helper for cron: record a sent morning reminder (service role only) ─

create or replace function public.record_morning_reminder(
  p_couple_id uuid,
  p_user_id uuid,
  p_reminder_date date
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.morning_reminder_log (couple_id, user_id, reminder_date)
  values (p_couple_id, p_user_id, p_reminder_date)
  on conflict (user_id, reminder_date) do nothing
  returning id into v_id;

  return v_id is not null;
end;
$$;

create or replace function public.was_morning_reminder_sent(
  p_user_id uuid,
  p_reminder_date date
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.morning_reminder_log
    where user_id = p_user_id
      and reminder_date = p_reminder_date
  );
$$;

revoke all on function public.record_morning_reminder(uuid, uuid, date) from public;
revoke all on function public.was_morning_reminder_sent(uuid, date) from public;

grant execute on function public.record_morning_reminder(uuid, uuid, date) to service_role;
grant execute on function public.was_morning_reminder_sent(uuid, date) to service_role;
