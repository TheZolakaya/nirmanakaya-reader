-- Migration 009: Add narrative summary + hashtags to user_readings
-- Supports Ariadne Thread journey continuity
-- narrative_summary: Haiku-generated 1-2 sentence micro-summary of each reading
-- hashtags: Auto-generated topic tags for filtering and journey narrative

ALTER TABLE user_readings ADD COLUMN IF NOT EXISTS narrative_summary TEXT;
ALTER TABLE user_readings ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';

-- GIN index for hashtag searches (e.g., "find all readings tagged 'career'")
CREATE INDEX IF NOT EXISTS idx_user_readings_hashtags ON user_readings USING GIN(hashtags);
