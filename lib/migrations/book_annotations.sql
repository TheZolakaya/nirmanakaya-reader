-- Book Annotations table
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

create table if not exists book_annotations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  chapter_slug text not null,
  content text not null,
  is_public boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table book_annotations enable row level security;

-- Anyone can read public annotations
create policy "Public annotations readable by all"
  on book_annotations for select
  using (is_public = true);

-- Users can read their own annotations (public or private)
create policy "Users can read own annotations"
  on book_annotations for select
  using (auth.uid() = user_id);

-- Users can create their own annotations
create policy "Users can create annotations"
  on book_annotations for insert
  with check (auth.uid() = user_id);

-- Users can update their own annotations
create policy "Users can update own annotations"
  on book_annotations for update
  using (auth.uid() = user_id);

-- Users can delete their own annotations
create policy "Users can delete own annotations"
  on book_annotations for delete
  using (auth.uid() = user_id);

-- Indexes for fast queries
create index if not exists idx_book_annotations_chapter
  on book_annotations(chapter_slug, is_public);

create index if not exists idx_book_annotations_user
  on book_annotations(user_id);
