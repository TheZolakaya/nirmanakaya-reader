-- Migration: Add locus_subjects JSONB column to support subjects-based locus
-- Run this in Supabase SQL Editor
-- This is ADDITIVE — existing locus/locus_detail columns are preserved for backward compat

-- Add locus_subjects to user_readings
ALTER TABLE user_readings
ADD COLUMN IF NOT EXISTS locus_subjects jsonb DEFAULT '[]'::jsonb;

-- Add locus_subjects to user_email_preferences
ALTER TABLE user_email_preferences
ADD COLUMN IF NOT EXISTS locus_subjects jsonb DEFAULT '[]'::jsonb;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name IN ('user_readings', 'user_email_preferences')
  AND column_name = 'locus_subjects';
