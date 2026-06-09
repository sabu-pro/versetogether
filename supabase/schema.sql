create extension if not exists "uuid-ossp";

-- ── Couples & invites ───────────────────────────────────────────────────────

create table if not exists public.couples (
  id uuid primary key default uuid_generate_v4(),
  name text,
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists public.invite_codes (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  code text not null unique,
  created_by uuid not null,
  used_by uuid,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- ── Profiles ────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  partner_order integer not null check (partner_order in (1, 2)),
  couple_id uuid references public.couples(id) on delete set null,
  created_at timestamptz default now()
);

create unique index if not exists profiles_couple_partner_order_unique
  on public.profiles (couple_id, partner_order)
  where couple_id is not null;

-- ── Shared couple data ────────────────────────────────────────────────────────

create table if not exists public.daily_verses (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  verse_date date not null,
  responsible_user_id uuid references public.profiles(id) on delete set null,
  bible_reference text not null,
  verse_text text not null,
  main_reflection text not null,
  prayer_note text,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  submitted_at timestamptz default now()
);

create unique index if not exists daily_verses_couple_date_unique
  on public.daily_verses (couple_id, verse_date);

create table if not exists public.reflections (
  id uuid primary key default uuid_generate_v4(),
  verse_id uuid not null references public.daily_verses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reflection_text text not null,
  read_status boolean default true,
  prayed_status boolean default false,
  reaction text check (reaction in ('read', 'amen', 'encouraged', 'prayed')),
  created_at timestamptz default now(),
  unique (verse_id, user_id)
);

create table if not exists public.prayer_requests (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_text text not null,
  is_answered boolean default false,
  created_at timestamptz default now(),
  answered_at timestamptz
);

create table if not exists public.weekly_goals (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  week_start date not null,
  goal_text text not null,
  completed boolean default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create unique index if not exists weekly_goals_couple_week_unique
  on public.weekly_goals (couple_id, week_start);

-- ── Per-user data ─────────────────────────────────────────────────────────────

create table if not exists public.app_notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean default false,
  link text,
  created_at timestamptz default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── RLS helper ────────────────────────────────────────────────────────────────

create or replace function public.user_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid()
$$;

-- ── Onboarding RPCs ─────────────────────────────────────────────────────────

create or replace function public.create_couple_with_profile(p_name text, p_email text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_code text;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'Profile already exists';
  end if;

  insert into public.couples default values returning id into v_couple_id;

  insert into public.profiles (id, email, name, partner_order, couple_id)
  values (v_user_id, p_email, p_name, 1, v_couple_id);

  update public.couples set created_by = v_user_id where id = v_couple_id;

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  insert into public.invite_codes (couple_id, code, created_by)
  values (v_couple_id, v_code, v_user_id);

  return json_build_object('couple_id', v_couple_id, 'invite_code', v_code);
end;
$$;

create or replace function public.join_couple_with_profile(p_code text, p_name text, p_email text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.invite_codes%rowtype;
  v_member_count int;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'Profile already exists';
  end if;

  select * into v_invite
  from public.invite_codes
  where upper(code) = upper(trim(p_code)) and used_by is null
  limit 1;

  if v_invite.id is null then raise exception 'Invalid or already used invite code'; end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Invite code has expired';
  end if;

  select count(*) into v_member_count
  from public.profiles where couple_id = v_invite.couple_id;

  if v_member_count >= 2 then raise exception 'This couple already has two partners'; end if;
  if v_member_count = 0 then raise exception 'Couple not found'; end if;

  insert into public.profiles (id, email, name, partner_order, couple_id)
  values (v_user_id, p_email, p_name, 2, v_invite.couple_id);

  update public.invite_codes
  set used_by = v_user_id, used_at = now()
  where id = v_invite.id;

  return json_build_object('couple_id', v_invite.couple_id);
end;
$$;

create or replace function public.get_active_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid;
  v_code text;
  v_member_count int;
begin
  select couple_id into v_couple_id from public.profiles where id = auth.uid();
  if v_couple_id is null then return null; end if;

  select count(*) into v_member_count from public.profiles where couple_id = v_couple_id;
  if v_member_count >= 2 then return null; end if;

  select code into v_code
  from public.invite_codes
  where couple_id = v_couple_id and used_by is null
  order by created_at desc
  limit 1;

  if v_code is null then
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    insert into public.invite_codes (couple_id, code, created_by)
    values (v_couple_id, v_code, auth.uid());
  end if;

  return v_code;
end;
$$;

grant execute on function public.create_couple_with_profile(text, text) to authenticated;
grant execute on function public.join_couple_with_profile(text, text, text) to authenticated;
grant execute on function public.get_active_invite_code() to authenticated;

-- ── Row level security ──────────────────────────────────────────────────────

alter table public.couples enable row level security;
alter table public.invite_codes enable row level security;
alter table public.profiles enable row level security;
alter table public.daily_verses enable row level security;
alter table public.reflections enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.weekly_goals enable row level security;
alter table public.app_notifications enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "couples_select" on public.couples;
drop policy if exists "couples_insert" on public.couples;
drop policy if exists "invite_codes_select" on public.invite_codes;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "daily_verses_select" on public.daily_verses;
drop policy if exists "daily_verses_insert" on public.daily_verses;
drop policy if exists "daily_verses_update" on public.daily_verses;
drop policy if exists "daily_verses_delete" on public.daily_verses;
drop policy if exists "reflections_select" on public.reflections;
drop policy if exists "reflections_insert" on public.reflections;
drop policy if exists "reflections_update" on public.reflections;
drop policy if exists "prayers_select" on public.prayer_requests;
drop policy if exists "prayers_insert" on public.prayer_requests;
drop policy if exists "prayers_update" on public.prayer_requests;
drop policy if exists "goals_select" on public.weekly_goals;
drop policy if exists "goals_insert" on public.weekly_goals;
drop policy if exists "goals_update" on public.weekly_goals;
drop policy if exists "notifications_select" on public.app_notifications;
drop policy if exists "notifications_insert" on public.app_notifications;
drop policy if exists "notifications_update" on public.app_notifications;
drop policy if exists "notifications_delete" on public.app_notifications;
drop policy if exists "push_subscriptions_select" on public.push_subscriptions;
drop policy if exists "push_subscriptions_insert" on public.push_subscriptions;
drop policy if exists "push_subscriptions_update" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete" on public.push_subscriptions;

create policy "couples_select" on public.couples
  for select using (id = public.user_couple_id());

create policy "couples_insert" on public.couples
  for insert with check (auth.role() = 'authenticated');

create policy "invite_codes_select" on public.invite_codes
  for select using (couple_id = public.user_couple_id());

create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or (couple_id is not null and couple_id = public.user_couple_id())
  );

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

create policy "daily_verses_select" on public.daily_verses
  for select using (couple_id = public.user_couple_id());

create policy "daily_verses_insert" on public.daily_verses
  for insert with check (
    auth.uid() = submitted_by
    and couple_id = public.user_couple_id()
  );

create policy "daily_verses_update" on public.daily_verses
  for update using (
    auth.uid() = submitted_by
    and couple_id = public.user_couple_id()
  );

create policy "daily_verses_delete" on public.daily_verses
  for delete using (
    auth.uid() = submitted_by
    and couple_id = public.user_couple_id()
  );

create policy "reflections_select" on public.reflections
  for select using (
    exists (
      select 1 from public.daily_verses dv
      where dv.id = verse_id and dv.couple_id = public.user_couple_id()
    )
  );

create policy "reflections_insert" on public.reflections
  for insert with check (auth.uid() = user_id);

create policy "reflections_update" on public.reflections
  for update using (auth.uid() = user_id);

create policy "prayers_select" on public.prayer_requests
  for select using (couple_id = public.user_couple_id());

create policy "prayers_insert" on public.prayer_requests
  for insert with check (
    auth.uid() = user_id
    and couple_id = public.user_couple_id()
  );

create policy "prayers_update" on public.prayer_requests
  for update using (couple_id = public.user_couple_id());

create policy "goals_select" on public.weekly_goals
  for select using (couple_id = public.user_couple_id());

create policy "goals_insert" on public.weekly_goals
  for insert with check (
    auth.uid() = created_by
    and couple_id = public.user_couple_id()
  );

create policy "goals_update" on public.weekly_goals
  for update using (couple_id = public.user_couple_id());

create policy "notifications_select" on public.app_notifications
  for select using (auth.uid() = user_id);

create policy "notifications_insert" on public.app_notifications
  for insert with check (auth.role() = 'authenticated');

create policy "notifications_update" on public.app_notifications
  for update using (auth.uid() = user_id);

create policy "notifications_delete" on public.app_notifications
  for delete using (auth.uid() = user_id);

create policy "push_subscriptions_select" on public.push_subscriptions
  for select using (auth.uid() = user_id);

create policy "push_subscriptions_insert" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "push_subscriptions_update" on public.push_subscriptions
  for update using (auth.uid() = user_id);

create policy "push_subscriptions_delete" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- ── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists idx_profiles_couple on public.profiles(couple_id);
create index if not exists idx_daily_verses_couple_date on public.daily_verses(couple_id, verse_date desc);
create index if not exists idx_reflections_verse on public.reflections(verse_id);
create index if not exists idx_prayers_couple on public.prayer_requests(couple_id);
create index if not exists idx_goals_couple on public.weekly_goals(couple_id);
create index if not exists idx_notifications_user on public.app_notifications(user_id, is_read);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id, endpoint);
