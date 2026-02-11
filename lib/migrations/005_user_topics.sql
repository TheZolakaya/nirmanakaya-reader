-- Migration 005: User Topics + topic_id FK on user_readings
-- Saved recurring reading topics (max 7 active per user, enforced in application)

CREATE TABLE IF NOT EXISTS user_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived BOOLEAN NOT NULL DEFAULT false,
  reading_count INT NOT NULL DEFAULT 0,
  meta_analysis JSONB DEFAULT NULL
  -- meta_analysis shape: { text: string, generated_at: string, reading_count: number }
);

-- RLS
ALTER TABLE user_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own topics"
  ON user_topics FOR ALL
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_topics_user
  ON user_topics(user_id, archived, last_used_at DESC);

-- Add topic_id FK to user_readings
ALTER TABLE user_readings
  ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES user_topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_readings_topic
  ON user_readings(topic_id) WHERE topic_id IS NOT NULL;
