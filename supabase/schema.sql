create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  partner_order integer not null check (partner_order in (1, 2)),
  created_at timestamptz default now()
);

create table if not exists public.daily_verses (
  id uuid primary key default uuid_generate_v4(),
  verse_date date not null unique,
  responsible_user_id uuid references public.profiles(id) on delete set null,
  bible_reference text not null,
  verse_text text not null,
  main_reflection text not null,
  prayer_note text,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  submitted_at timestamptz default now()
);

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
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_text text not null,
  is_answered boolean default false,
  created_at timestamptz default now(),
  answered_at timestamptz
);

create table if not exists public.weekly_goals (
  id uuid primary key default uuid_generate_v4(),
  week_start date not null unique,
  goal_text text not null,
  completed boolean default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.app_notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean default false,
  link text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.daily_verses enable row level security;
alter table public.reflections enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.weekly_goals enable row level security;
alter table public.app_notifications enable row level security;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "daily_verses_select" on public.daily_verses;
drop policy if exists "daily_verses_insert" on public.daily_verses;
drop policy if exists "daily_verses_update" on public.daily_verses;
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

create policy "profiles_select" on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

create policy "daily_verses_select" on public.daily_verses for select using (auth.role() = 'authenticated');
create policy "daily_verses_insert" on public.daily_verses for insert with check (auth.uid() = submitted_by);
create policy "daily_verses_update" on public.daily_verses for update using (auth.uid() = submitted_by);

create policy "reflections_select" on public.reflections for select using (auth.role() = 'authenticated');
create policy "reflections_insert" on public.reflections for insert with check (auth.uid() = user_id);
create policy "reflections_update" on public.reflections for update using (auth.uid() = user_id);

create policy "prayers_select" on public.prayer_requests for select using (auth.role() = 'authenticated');
create policy "prayers_insert" on public.prayer_requests for insert with check (auth.uid() = user_id);
create policy "prayers_update" on public.prayer_requests for update using (auth.role() = 'authenticated');

create policy "goals_select" on public.weekly_goals for select using (auth.role() = 'authenticated');
create policy "goals_insert" on public.weekly_goals for insert with check (auth.uid() = created_by);
create policy "goals_update" on public.weekly_goals for update using (auth.role() = 'authenticated');

create policy "notifications_select" on public.app_notifications for select using (auth.uid() = user_id);
create policy "notifications_insert" on public.app_notifications for insert with check (auth.role() = 'authenticated');
create policy "notifications_update" on public.app_notifications for update using (auth.uid() = user_id);

create index if not exists idx_daily_verses_date on public.daily_verses(verse_date desc);
create index if not exists idx_reflections_verse on public.reflections(verse_id);
create index if not exists idx_prayers_user on public.prayer_requests(user_id);
create index if not exists idx_notifications_user on public.app_notifications(user_id, is_read);
