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
-- DONE!
-- ============================================
-- Reply counts will now auto-update when
-- replies are added or removed.
-- Profiles auto-created on signup.
-- Existing reply counts fixed.
-- ============================================
