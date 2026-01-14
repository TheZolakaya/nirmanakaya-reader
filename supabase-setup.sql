-- ============================================
-- NIRMANAKAYA READER - SUPABASE DATABASE SETUP
-- ============================================
-- Run this in the Supabase SQL Editor
-- Last updated: 2026-01-15 (v0.68.1)
-- ============================================

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name text,
  avatar_url text,
  bio text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  last_hub_visit timestamptz,
  notification_prefs text DEFAULT 'all'
);

-- Add new columns if table already exists
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_hub_visit timestamptz,
ADD COLUMN IF NOT EXISTS notification_prefs text DEFAULT 'all';

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- READINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS readings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  question text,
  mode text,
  spread_type text,
  cards jsonb,
  synthesis jsonb,
  letter text,
  share_slug text UNIQUE,
  is_public boolean DEFAULT false,
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  estimated_cost numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;

-- Policies for readings
DROP POLICY IF EXISTS "Users can view own readings" ON readings;
CREATE POLICY "Users can view own readings" ON readings
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Users can insert own readings" ON readings;
CREATE POLICY "Users can insert own readings" ON readings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own readings" ON readings;
CREATE POLICY "Users can update own readings" ON readings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own readings" ON readings;
CREATE POLICY "Users can delete own readings" ON readings
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- DISCUSSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS discussions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  topic_type text DEFAULT 'general',
  topic_ref text,
  reply_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;

-- Policies for discussions
DROP POLICY IF EXISTS "Anyone can read discussions" ON discussions;
CREATE POLICY "Anyone can read discussions" ON discussions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create discussions" ON discussions;
CREATE POLICY "Authenticated users can create discussions" ON discussions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own discussions" ON discussions;
CREATE POLICY "Users can update own discussions" ON discussions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own discussions" ON discussions;
CREATE POLICY "Users can delete own discussions" ON discussions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- DISCUSSION REPLIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS discussion_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id uuid REFERENCES discussions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;

-- Policies for discussion_replies
DROP POLICY IF EXISTS "Anyone can read replies" ON discussion_replies;
CREATE POLICY "Anyone can read replies" ON discussion_replies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create replies" ON discussion_replies;
CREATE POLICY "Authenticated users can create replies" ON discussion_replies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own replies" ON discussion_replies;
CREATE POLICY "Users can delete own replies" ON discussion_replies
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_readings_user_id ON readings(user_id);
CREATE INDEX IF NOT EXISTS idx_readings_share_slug ON readings(share_slug);
CREATE INDEX IF NOT EXISTS idx_readings_is_public ON readings(is_public);
CREATE INDEX IF NOT EXISTS idx_discussions_user_id ON discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_topic_type ON discussions(topic_type);
CREATE INDEX IF NOT EXISTS idx_discussions_created_at ON discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_discussion_id ON discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_user_id ON discussion_replies(user_id);

-- ============================================
-- DONE!
-- ============================================
-- After running this script:
-- 1. Go to Authentication > Providers and enable Google
-- 2. Add your Google OAuth credentials
-- 3. Set the redirect URL in Google Console to:
--    https://YOUR_PROJECT.supabase.co/auth/v1/callback
-- ============================================
