-- =====================================================
-- EMAIL PREFERENCES MIGRATION
-- Run this in your Supabase SQL Editor (Database > SQL Editor)
-- Adds email preference columns to profiles table
-- =====================================================

-- Add email preference columns (all default to true = opted in)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_welcome BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_readings BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_replies BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_updates BOOLEAN DEFAULT true;

-- Update existing profiles to have default values
UPDATE public.profiles
SET
  email_welcome = COALESCE(email_welcome, true),
  email_readings = COALESCE(email_readings, true),
  email_replies = COALESCE(email_replies, true),
  email_updates = COALESCE(email_updates, true)
WHERE email_welcome IS NULL
   OR email_readings IS NULL
   OR email_replies IS NULL
   OR email_updates IS NULL;

-- =====================================================
-- DONE! Email preferences are now available.
-- Users can opt out of:
--   email_welcome  - Welcome emails on signup
--   email_readings - Auto-send reading results
--   email_replies  - Forum reply notifications
--   email_updates  - Version updates / broadcasts
-- =====================================================
