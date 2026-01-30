-- =============================================================================
-- Locus Control + Email Readings — Schema Migration
-- Run this in Supabase SQL Editor BEFORE deploying the feature
-- =============================================================================

-- 1. Feature Flags (singleton table for admin toggles)
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  locus_control_enabled BOOLEAN DEFAULT false,
  email_system_enabled BOOLEAN DEFAULT true
);

-- Insert singleton row if empty
INSERT INTO feature_flags (locus_control_enabled, email_system_enabled)
SELECT false, true
WHERE NOT EXISTS (SELECT 1 FROM feature_flags);

-- RLS: public read, admin write
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_read" ON feature_flags
  FOR SELECT USING (true);

-- 2. User Email Preferences
CREATE TABLE IF NOT EXISTS user_email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Email toggle
  email_readings_enabled BOOLEAN DEFAULT true,

  -- Topic settings
  topic_mode TEXT DEFAULT 'general' CHECK (topic_mode IN ('general', 'custom', 'glistener')),
  custom_topic TEXT,

  -- Locus settings
  locus TEXT DEFAULT 'individual' CHECK (locus IN ('individual', 'relationship', 'family', 'team', 'community', 'custom')),
  locus_detail TEXT,

  -- Reading settings
  card_count INTEGER DEFAULT 1 CHECK (card_count BETWEEN 1 AND 3),
  voice TEXT DEFAULT 'friend',

  -- Admin override
  admin_override TEXT DEFAULT 'default' CHECK (admin_override IN ('default', 'force_on', 'force_off')),

  UNIQUE(user_id)
);

-- Index for cron job (find all enabled users)
CREATE INDEX IF NOT EXISTS idx_user_email_prefs_enabled
  ON user_email_preferences(email_readings_enabled)
  WHERE email_readings_enabled = true;

-- RLS: users can read/write their own row
ALTER TABLE user_email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_email_prefs_own" ON user_email_preferences
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. User Readings (stored personal readings)
CREATE TABLE IF NOT EXISTS user_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Reading metadata
  reading_type TEXT DEFAULT 'automated' CHECK (reading_type IN ('automated', 'manual')),
  topic_mode TEXT,
  topic TEXT,
  locus TEXT,
  locus_detail TEXT,
  card_count INTEGER,
  voice TEXT,

  -- The draws (JSON array of {transient, position, status} objects)
  draws JSONB NOT NULL,

  -- Interpretation content (full reading structure)
  interpretation JSONB NOT NULL,

  -- For sharing
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_public BOOLEAN DEFAULT false
);

-- Index for user's reading history
CREATE INDEX IF NOT EXISTS idx_user_readings_user
  ON user_readings(user_id, created_at DESC);

-- Index for share links
CREATE INDEX IF NOT EXISTS idx_user_readings_share
  ON user_readings(share_token)
  WHERE share_token IS NOT NULL;

-- RLS: users read own, public reads via share_token
ALTER TABLE user_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_readings_own" ON user_readings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_readings_public" ON user_readings
  FOR SELECT USING (is_public = true);

-- 4. Email Settings (singleton table for admin email config)
CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT,

  -- Schedule
  email_frequency TEXT DEFAULT 'weekly' CHECK (email_frequency IN ('daily', 'weekly')),
  send_hour INTEGER DEFAULT 7,   -- UTC
  send_day INTEGER DEFAULT 1,    -- 0=Sunday, 1=Monday (for weekly)

  -- Defaults for new users
  default_card_count INTEGER DEFAULT 1,
  default_voice TEXT DEFAULT 'friend',

  -- Feature flags
  email_system_enabled BOOLEAN DEFAULT true,

  -- Stats tracking
  last_send_at TIMESTAMP WITH TIME ZONE,
  last_send_count INTEGER DEFAULT 0,
  last_send_failed INTEGER DEFAULT 0
);

-- Insert singleton row if empty
INSERT INTO email_settings (email_frequency, send_hour, send_day)
SELECT 'weekly', 7, 1
WHERE NOT EXISTS (SELECT 1 FROM email_settings);

-- RLS: public read (for cron), admin write
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_settings_read" ON email_settings
  FOR SELECT USING (true);

-- =============================================================================
-- DONE. Run this migration, then deploy the feature code.
-- =============================================================================
