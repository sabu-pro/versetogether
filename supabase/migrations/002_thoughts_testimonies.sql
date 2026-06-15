-- Add Thoughts & Testimonies for couple-scoped encouragement sharing

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

create index if not exists idx_thoughts_couple on public.thoughts_testimonies(couple_id, created_at desc);
