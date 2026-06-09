-- Migration: upgrade existing single-couple VerseTogether to multi-couple
-- Run this in Supabase SQL Editor AFTER the original schema.sql was applied.
-- Safe for existing Sabut/Sabita data: creates one couple and attaches all rows.

create extension if not exists "uuid-ossp";

-- ── New tables ──────────────────────────────────────────────────────────────

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

-- ── Add couple_id columns (nullable during backfill) ────────────────────────

alter table public.profiles
  add column if not exists couple_id uuid references public.couples(id) on delete set null;

alter table public.daily_verses
  add column if not exists couple_id uuid references public.couples(id) on delete cascade;

alter table public.prayer_requests
  add column if not exists couple_id uuid references public.couples(id) on delete cascade;

alter table public.weekly_goals
  add column if not exists couple_id uuid references public.couples(id) on delete cascade;

-- ── Backfill existing data into a default couple ────────────────────────────

do $$
declare
  v_couple_id uuid;
  v_first_profile uuid;
begin
  if exists (select 1 from public.profiles where couple_id is null) then
    insert into public.couples (name) values ('Sabut & Sabita') returning id into v_couple_id;

    select id into v_first_profile
    from public.profiles
    order by partner_order
    limit 1;

    update public.couples set created_by = v_first_profile where id = v_couple_id;

    update public.profiles set couple_id = v_couple_id where couple_id is null;

    update public.daily_verses dv
    set couple_id = p.couple_id
    from public.profiles p
    where dv.submitted_by = p.id and dv.couple_id is null;

    update public.prayer_requests pr
    set couple_id = p.couple_id
    from public.profiles p
    where pr.user_id = p.id and pr.couple_id is null;

    update public.weekly_goals wg
    set couple_id = p.couple_id
    from public.profiles p
    where wg.created_by = p.id and wg.couple_id is null;

    -- Generate invite code for the migrated couple (partner may already be joined)
    if v_first_profile is not null then
      insert into public.invite_codes (couple_id, code, created_by, used_at, used_by)
      select
        v_couple_id,
        upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
        v_first_profile,
        case when (select count(*) from public.profiles where couple_id = v_couple_id) >= 2
          then now() else null end,
        case when (select count(*) from public.profiles where couple_id = v_couple_id) >= 2
          then (select id from public.profiles where couple_id = v_couple_id and partner_order = 2 limit 1)
          else null end
      on conflict do nothing;
    end if;
  end if;
end $$;

-- ── Replace global unique constraints with per-couple uniques ───────────────

alter table public.daily_verses drop constraint if exists daily_verses_verse_date_key;
create unique index if not exists daily_verses_couple_date_unique
  on public.daily_verses (couple_id, verse_date);

alter table public.weekly_goals drop constraint if exists weekly_goals_week_start_key;
create unique index if not exists weekly_goals_couple_week_unique
  on public.weekly_goals (couple_id, week_start);

create unique index if not exists profiles_couple_partner_order_unique
  on public.profiles (couple_id, partner_order)
  where couple_id is not null;

-- ── Helper: current user's couple ───────────────────────────────────────────

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

-- ── RLS for new tables + updated policies ───────────────────────────────────

alter table public.couples enable row level security;
alter table public.invite_codes enable row level security;

drop policy if exists "couples_select" on public.couples;
drop policy if exists "couples_insert" on public.couples;
drop policy if exists "invite_codes_select" on public.invite_codes;

create policy "couples_select" on public.couples
  for select using (id = public.user_couple_id());

create policy "couples_insert" on public.couples
  for insert with check (auth.role() = 'authenticated');

create policy "invite_codes_select" on public.invite_codes
  for select using (couple_id = public.user_couple_id());

-- Update existing table policies for couple isolation
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "daily_verses_select" on public.daily_verses;
drop policy if exists "daily_verses_insert" on public.daily_verses;
drop policy if exists "daily_verses_update" on public.daily_verses;
drop policy if exists "daily_verses_delete" on public.daily_verses;
drop policy if exists "prayers_select" on public.prayer_requests;
drop policy if exists "prayers_insert" on public.prayer_requests;
drop policy if exists "prayers_update" on public.prayer_requests;
drop policy if exists "goals_select" on public.weekly_goals;
drop policy if exists "goals_insert" on public.weekly_goals;
drop policy if exists "goals_update" on public.weekly_goals;

create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or (couple_id is not null and couple_id = public.user_couple_id())
  );

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

drop policy if exists "reflections_select" on public.reflections;

create policy "reflections_select" on public.reflections
  for select using (
    exists (
      select 1 from public.daily_verses dv
      where dv.id = verse_id and dv.couple_id = public.user_couple_id()
    )
  );

create index if not exists idx_profiles_couple on public.profiles(couple_id);
create index if not exists idx_daily_verses_couple_date on public.daily_verses(couple_id, verse_date desc);
create index if not exists idx_prayers_couple on public.prayer_requests(couple_id);
create index if not exists idx_goals_couple on public.weekly_goals(couple_id);

grant execute on function public.create_couple_with_profile(text, text) to authenticated;
grant execute on function public.join_couple_with_profile(text, text, text) to authenticated;
grant execute on function public.get_active_invite_code() to authenticated;
