-- Run this in Supabase SQL editor to fix auth persistence and RLS

-- Create trigger to auto-insert profile on new auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, created_at, updated_at)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), now(), now())
  on conflict (id) do update set updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable RLS where required
alter table if exists public.profiles enable row level security;
alter table if exists public.notes enable row level security;
alter table if exists public.note_shares enable row level security;
alter table if exists public.comments enable row level security;
alter table if exists public.authorized_uploaders enable row level security;
alter table if exists public.upload_requests enable row level security;

-- Policies for profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Policies for notes
drop policy if exists "notes_select_own_or_public" on public.notes;
create policy "notes_select_own_or_public" on public.notes
  for select using (auth.uid() = user_id or is_public = true or is_shared = true);
drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);
drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id);
drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);

-- Policies for note_shares
drop policy if exists "note_shares_select_by_participants" on public.note_shares;
create policy "note_shares_select_by_participants" on public.note_shares
  for select using (auth.uid() = shared_by or auth.uid() = shared_with);
drop policy if exists "note_shares_insert_by_owner" on public.note_shares;
create policy "note_shares_insert_by_owner" on public.note_shares
  for insert with check (auth.uid() = shared_by);

-- Policies for comments
drop policy if exists "comments_select_on_own_notes" on public.comments;
create policy "comments_select_on_own_notes" on public.comments
  for select using (true);
drop policy if exists "comments_insert_by_authenticated" on public.comments;
create policy "comments_insert_by_authenticated" on public.comments
  for insert with check (auth.uid() = user_id);
drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own" on public.comments
  for update using (auth.uid() = user_id);
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments
  for delete using (auth.uid() = user_id);

-- Policies for authorized_uploaders
drop policy if exists "authorized_uploaders_select_self" on public.authorized_uploaders;
drop policy if exists "read own authorized_uploader row" on public.authorized_uploaders;
drop policy if exists "admin manage authorized_uploaders" on public.authorized_uploaders;
create policy "authorized_uploaders_select_self" on public.authorized_uploaders
  for select using (auth.uid() = user_id);

-- Policies for upload_requests (any signed-in user can create their own request)
drop policy if exists "upload_requests_select_own_email" on public.upload_requests;
create policy "upload_requests_select_own_email" on public.upload_requests
  for select using (auth.email() = user_email);
drop policy if exists "upload_requests_insert_self" on public.upload_requests;
create policy "upload_requests_insert_self" on public.upload_requests
  for insert with check (auth.email() = user_email);

-- Auto-approve notes when uploaded by authorized uploaders
create or replace function public.auto_approve_authorized_notes()
returns trigger as $$
begin
  if exists (
    select 1 from public.authorized_uploaders au
    where au.user_id = new.user_id
      and au.is_active = true
  ) then
    new.is_approved := true;
    new.is_public := coalesce(new.is_public, true);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_auto_approve_authorized_notes on public.notes;
create trigger trg_auto_approve_authorized_notes
  before insert on public.notes
  for each row execute function public.auto_approve_authorized_notes();

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- First, add missing columns to existing notes table (if it exists)
-- This handles the case where notes table already exists but is missing required columns
do $$
begin
  -- Add is_approved column if it doesn't exist
  if not exists (select 1 from information_schema.columns 
                where table_name = 'notes' and column_name = 'is_approved') then
    alter table notes add column is_approved boolean default false;
  end if;
  
  -- Add other required columns if they don't exist
  if not exists (select 1 from information_schema.columns 
                where table_name = 'notes' and column_name = 'filename') then
    alter table notes add column filename text;
  end if;
  
  if not exists (select 1 from information_schema.columns 
                where table_name = 'notes' and column_name = 'file_url') then
    alter table notes add column file_url text;
  end if;
  
  if not exists (select 1 from information_schema.columns 
                where table_name = 'notes' and column_name = 'subject') then
    alter table notes add column subject text;
  end if;
  
  if not exists (select 1 from information_schema.columns 
                where table_name = 'notes' and column_name = 'uploader_id') then
    alter table notes add column uploader_id uuid;
  end if;
  
  if not exists (select 1 from information_schema.columns 
                where table_name = 'notes' and column_name = 'uploader_email') then
    alter table notes add column uploader_email text;
  end if;
  
  if not exists (select 1 from information_schema.columns 
                where table_name = 'notes' and column_name = 'file_size') then
    alter table notes add column file_size bigint;
  end if;
  
  if not exists (select 1 from information_schema.columns 
                where table_name = 'notes' and column_name = 'download_count') then
    alter table notes add column download_count int default 0;
  end if;
end $$;

-- Tables
create table if not exists authorized_uploaders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique,
  user_email text not null,
  granted_by uuid,
  granted_at timestamptz default now(),
  permissions text[] default array['upload']::text[],
  is_active boolean default true
);

-- Create notes table only if it doesn't exist
create table if not exists notes (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  filename text not null,
  file_url text not null,
  subject text not null,
  description text,
  uploader_id uuid not null,
  uploader_email text,
  file_size bigint,
  download_count int default 0,
  is_approved boolean default false,
  updated_at timestamptz default now()
);

create table if not exists upload_requests (
  id uuid primary key default uuid_generate_v4(),
  user_email text not null,
  user_name text,
  reason text,
  requested_at timestamptz default now(),
  status text check (status in ('pending','approved','rejected')) default 'pending',
  reviewed_by uuid
);

-- RLS
alter table authorized_uploaders enable row level security;
alter table notes enable row level security;
alter table upload_requests enable row level security;

-- Policies: authorized_uploaders
create policy "read own authorized_uploader row" on authorized_uploaders
  for select using (auth.uid() = user_id);

-- Allow admins (defined via auth.role() = 'service_role' in server context) full access
create policy "admin manage authorized_uploaders" on authorized_uploaders
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Policies: notes
drop policy if exists "public read approved notes" on notes;
create policy "public read approved notes" on notes
  for select using (is_approved = true);

drop policy if exists "uploader read own notes" on notes;
create policy "uploader read own notes" on notes
  for select using (auth.uid() = uploader_id);

drop policy if exists "authorized insert notes" on notes;
create policy "authorized insert notes" on notes
  for insert with check (
    auth.uid() is not null
    and exists (
      select 1 from authorized_uploaders au
      where au.user_id = auth.uid() and au.is_active = true
    )
  );

drop policy if exists "uploader update own notes (non-sensitive)" on notes;
create policy "uploader update own notes (non-sensitive)" on notes
  for update using (auth.uid() = uploader_id) with check (auth.uid() = uploader_id);

-- Allow admins to manage notes
drop policy if exists "admin manage notes" on notes;
create policy "admin manage notes" on notes
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Policies: upload_requests
drop policy if exists "user insert upload_request" on upload_requests;
create policy "user insert upload_request" on upload_requests
  for insert with check (auth.uid() is not null);

drop policy if exists "user read own requests" on upload_requests;
create policy "user read own requests" on upload_requests
  for select using (auth.jwt() ->> 'email' = user_email);

drop policy if exists "admin manage requests" on upload_requests;
create policy "admin manage requests" on upload_requests
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Storage: bucket and policies
-- Create the notes bucket if it doesn't exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notes', 'notes', false, 52428800, array['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

-- Create the thumbnails bucket if it doesn't exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('thumbnails', 'thumbnails', false, 5242880, array['image/jpeg', 'image/png', 'image/gif'])
on conflict (id) do nothing;

-- Storage policies for notes bucket
-- Drop existing policies first
drop policy if exists "notes_read_public" on storage.objects;
drop policy if exists "notes_upload_authorized" on storage.objects;
drop policy if exists "notes_update_own" on storage.objects;
drop policy if exists "notes_delete_own" on storage.objects;

-- Allow anyone to read files (for signed URLs)
create policy "notes_read_public" on storage.objects
for select using (bucket_id = 'notes');

-- Allow authorized users to upload files
create policy "notes_upload_authorized" on storage.objects
for insert with check (
  bucket_id = 'notes' 
  and auth.role() = 'authenticated'
  and exists (
    select 1 from authorized_uploaders 
    where user_id = auth.uid() and is_active = true
  )
);

-- Allow uploaders to update their own files
create policy "notes_update_own" on storage.objects
for update using (
  bucket_id = 'notes' 
  and auth.role() = 'authenticated'
  and exists (
    select 1 from notes n
    where n.file_url = name
    and n.uploader_id = auth.uid()
  )
);

-- Allow uploaders to delete their own files
create policy "notes_delete_own" on storage.objects
for delete using (
  bucket_id = 'notes' 
  and auth.role() = 'authenticated'
  and exists (
    select 1 from notes n
    where n.file_url = name
    and n.uploader_id = auth.uid()
  )
);

-- Storage policies for thumbnails bucket
-- Drop existing policies first
drop policy if exists "thumbnails_read_public" on storage.objects;
drop policy if exists "thumbnails_upload_authorized" on storage.objects;

-- Allow anyone to read thumbnails
create policy "thumbnails_read_public" on storage.objects
for select using (bucket_id = 'thumbnails');

-- Allow authorized users to upload thumbnails
create policy "thumbnails_upload_authorized" on storage.objects
for insert with check (
  bucket_id = 'thumbnails' 
  and auth.role() = 'authenticated'
  and exists (
    select 1 from authorized_uploaders 
    where user_id = auth.uid() and is_active = true
  )
);


