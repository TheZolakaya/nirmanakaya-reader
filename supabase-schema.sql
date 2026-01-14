-- =====================================================
-- NIRMANAKAYA READER - SUPABASE SCHEMA
-- Run this in your Supabase SQL Editor (Database > SQL Editor)
-- =====================================================

-- =====================
-- PROFILES (extends auth.users)
-- =====================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  email text,
  avatar_url text,
  user_level int default 0,  -- 0=FirstContact, 1=Explorer, 2=Practitioner, 3=Architect, 4=Master
  preferences jsonb default '{}',  -- stance, persona, theme, etc.
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =====================
-- READINGS (the core)
-- =====================
create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,

  -- The reading itself
  question text,
  mode text,  -- reflect/discover/forge/explore
  spread_type text,
  cards jsonb,  -- [{transient, status, position, interpretation...}]
  synthesis jsonb,  -- summary, path, whyAppeared
  letter text,

  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Sharing
  is_public boolean default false,
  share_slug text unique  -- for /r/abc123 public links
);

-- Enable RLS
alter table public.readings enable row level security;

-- Readings policies
create policy "Users can view own readings" on public.readings
  for select using (auth.uid() = user_id);

create policy "Anyone can view public readings" on public.readings
  for select using (is_public = true);

create policy "Users can insert own readings" on public.readings
  for insert with check (auth.uid() = user_id);

create policy "Users can update own readings" on public.readings
  for update using (auth.uid() = user_id);

create policy "Users can delete own readings" on public.readings
  for delete using (auth.uid() = user_id);

-- Index for faster queries
create index if not exists readings_user_id_idx on public.readings(user_id);
create index if not exists readings_share_slug_idx on public.readings(share_slug);
create index if not exists readings_created_at_idx on public.readings(created_at desc);


-- =====================
-- SAVED CARDS (bookmarked insights)
-- =====================
create table if not exists public.saved_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  reading_id uuid references public.readings(id) on delete set null,

  transient_id int not null,
  status int not null,
  position int,
  card_name text,
  personal_notes text,

  created_at timestamptz default now()
);

-- Enable RLS
alter table public.saved_cards enable row level security;

-- Saved cards policies
create policy "Users can manage own saved cards" on public.saved_cards
  for all using (auth.uid() = user_id);

-- Index
create index if not exists saved_cards_user_id_idx on public.saved_cards(user_id);


-- =====================
-- DISCUSSIONS (Ring 5-6 hub) - FUTURE
-- =====================
create table if not exists public.discussions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,

  title text not null,
  content text not null,
  topic_type text,  -- 'archetype', 'bound', 'agent', 'concept', 'reading', 'general'
  topic_ref text,   -- archetype id, concept slug, or reading share_slug

  upvotes int default 0,
  reply_count int default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.discussions enable row level security;

-- Discussion policies
create policy "Anyone can read discussions" on public.discussions
  for select using (true);

create policy "Authenticated users can create discussions" on public.discussions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own discussions" on public.discussions
  for update using (auth.uid() = user_id);

create policy "Users can delete own discussions" on public.discussions
  for delete using (auth.uid() = user_id);

-- Indexes
create index if not exists discussions_topic_type_idx on public.discussions(topic_type);
create index if not exists discussions_created_at_idx on public.discussions(created_at desc);


-- =====================
-- DISCUSSION REPLIES (FUTURE)
-- =====================
create table if not exists public.discussion_replies (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid references public.discussions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,

  content text not null,
  upvotes int default 0,

  created_at timestamptz default now()
);

-- Enable RLS
alter table public.discussion_replies enable row level security;

-- Reply policies
create policy "Anyone can read replies" on public.discussion_replies
  for select using (true);

create policy "Authenticated users can create replies" on public.discussion_replies
  for insert with check (auth.uid() = user_id);

create policy "Users can update own replies" on public.discussion_replies
  for update using (auth.uid() = user_id);

create policy "Users can delete own replies" on public.discussion_replies
  for delete using (auth.uid() = user_id);


-- =====================
-- HELPFUL VIEWS
-- =====================

-- Reading count per user (for usage tracking)
create or replace view public.user_reading_counts as
select
  user_id,
  count(*) as total_readings,
  count(*) filter (where created_at > now() - interval '24 hours') as readings_today,
  count(*) filter (where created_at > now() - interval '7 days') as readings_this_week,
  max(created_at) as last_reading_at
from public.readings
group by user_id;


-- =====================
-- DONE!
-- =====================
-- Your database is ready. Next steps:
-- 1. Enable Google OAuth in Authentication > Providers
-- 2. Add your site URL to Authentication > URL Configuration
-- 3. Test sign-in from the Reader
