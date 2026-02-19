-- ============================================
-- NIRMANAKAYA READER - DATABASE TRIGGERS & FIXES
-- ============================================
-- Run this AFTER supabase-setup.sql
-- Or just run this one file - it handles everything
-- ============================================

-- Function to increment reply count
CREATE OR REPLACE FUNCTION increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE discussions
  SET reply_count = reply_count + 1
  WHERE id = NEW.discussion_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement reply count
CREATE OR REPLACE FUNCTION decrement_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE discussions
  SET reply_count = GREATEST(0, reply_count - 1)
  WHERE id = OLD.discussion_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_reply_insert ON discussion_replies;
DROP TRIGGER IF EXISTS on_reply_delete ON discussion_replies;

-- Create trigger for new replies
CREATE TRIGGER on_reply_insert
  AFTER INSERT ON discussion_replies
  FOR EACH ROW
  EXECUTE FUNCTION increment_reply_count();

-- Create trigger for deleted replies
CREATE TRIGGER on_reply_delete
  AFTER DELETE ON discussion_replies
  FOR EACH ROW
  EXECUTE FUNCTION decrement_reply_count();

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

-- Function to create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Anonymous'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- BACKFILL EXISTING USERS
-- ============================================
-- Create profiles for any existing users who don't have one
INSERT INTO public.profiles (id, display_name, avatar_url)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1), 'Anonymous'),
  raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FIX EXISTING REPLY COUNTS
-- ============================================
-- Update reply_count for all discussions based on actual replies
UPDATE discussions d
SET reply_count = (
  SELECT COUNT(*)
  FROM discussion_replies r
  WHERE r.discussion_id = d.id
);

-- ============================================
-- ADMIN FUNCTIONALITY
-- ============================================

-- Add is_admin column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Set admin flag for specific users (by email)
UPDATE profiles p
SET is_admin = true
FROM auth.users u
WHERE p.id = u.id
AND u.email = 'chriscrilly@gmail.com';

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update delete policies to allow admins

-- Discussions: allow admin delete
DROP POLICY IF EXISTS "Users can delete own discussions" ON discussions;
CREATE POLICY "Users can delete own discussions" ON discussions
  FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- Replies: allow admin delete
DROP POLICY IF EXISTS "Users can delete own replies" ON discussion_replies;
CREATE POLICY "Users can delete own replies" ON discussion_replies
  FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- Update edit policies to allow admins

-- Discussions: allow owner or admin to edit
DROP POLICY IF EXISTS "Users can update own discussions" ON discussions;
CREATE POLICY "Users can update own discussions" ON discussions
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

-- Replies: allow owner or admin to edit (no UPDATE policy existed before)
DROP POLICY IF EXISTS "Users can update own replies" ON discussion_replies;
CREATE POLICY "Users can update own replies" ON discussion_replies
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

-- ============================================
-- REACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  discussion_id uuid REFERENCES discussions(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES discussion_replies(id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT '👍',
  created_at timestamptz DEFAULT now(),
  -- Must have either discussion_id or reply_id, not both
  CHECK (
    (discussion_id IS NOT NULL AND reply_id IS NULL) OR
    (discussion_id IS NULL AND reply_id IS NOT NULL)
  )
);

-- Partial unique indexes for one reaction per user per item per emoji
CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_user_discussion_emoji
  ON reactions(user_id, discussion_id, emoji)
  WHERE discussion_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_user_reply_emoji
  ON reactions(user_id, reply_id, emoji)
  WHERE reply_id IS NOT NULL;

-- Enable RLS
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Policies for reactions
DROP POLICY IF EXISTS "Anyone can view reactions" ON reactions;
CREATE POLICY "Anyone can view reactions" ON reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can add reactions" ON reactions;
CREATE POLICY "Authenticated users can add reactions" ON reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own reactions" ON reactions;
CREATE POLICY "Users can remove own reactions" ON reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reactions_discussion_id ON reactions(discussion_id);
CREATE INDEX IF NOT EXISTS idx_reactions_reply_id ON reactions(reply_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);

-- ============================================
-- DONE!
-- ============================================
-- Reply counts will now auto-update when
-- replies are added or removed.
-- Profiles auto-created on signup.
-- Existing reply counts fixed.
-- Admins can delete any discussion/reply.
-- Reactions table for emoji responses.
-- ============================================
