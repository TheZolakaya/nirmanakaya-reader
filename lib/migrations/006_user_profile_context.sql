-- Migration 006: User Profile Context (private personalization)
-- Stores personal facts users share (manually or auto-extracted from conversations)
-- Used to personalize reading interpretations. NEVER exposed publicly.

CREATE TABLE IF NOT EXISTS user_profile_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fact TEXT NOT NULL,
  category TEXT NOT NULL, -- 'identity', 'life_situation', 'active_projects', 'self_knowledge', 'relationship_to_system'
  source TEXT NOT NULL DEFAULT 'manual',  -- 'manual' or 'auto'
  source_reading_id UUID DEFAULT NULL, -- links auto-extracted facts to source reading
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived BOOLEAN NOT NULL DEFAULT false
);

-- RLS
ALTER TABLE user_profile_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own context"
  ON user_profile_context FOR ALL
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_profile_context_user
  ON user_profile_context(user_id, archived);

-- Add personalization toggle to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS personalization_enabled BOOLEAN NOT NULL DEFAULT true;
