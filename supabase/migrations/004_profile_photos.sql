-- Migration 004: Profile photos (avatar_url + Storage bucket)
-- Safe for an already-running production database.
-- Run manually in Supabase SQL Editor.

-- ── 1. Profile avatar URL ───────────────────────────────────────────────────

alter table public.profiles
  add column if not exists avatar_url text;

-- ── 2. Storage bucket ───────────────────────────────────────────────────────
-- One photo per user at: profile-photos/{user_id}/avatar.webp

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── 3. Storage policies ─────────────────────────────────────────────────────
-- Users may only upload, replace, or delete files inside their own folder.
-- Public bucket allows read via public URL (for avatar display).

drop policy if exists "profile_photos_insert" on storage.objects;
drop policy if exists "profile_photos_update" on storage.objects;
drop policy if exists "profile_photos_delete" on storage.objects;

create policy "profile_photos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_photos_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_photos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
