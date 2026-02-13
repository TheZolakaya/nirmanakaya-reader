-- Migration 004: User Badges / Achievements
-- Tracks earned achievements for signature collection milestones

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reading_id UUID REFERENCES user_readings(id) ON DELETE SET NULL,
  notified BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, badge_key)
);

-- RLS
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- Service role inserts (badge checking runs server-side)
CREATE POLICY "Service role can insert badges"
  ON user_badges FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update badges"
  ON user_badges FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_unnotified ON user_badges(user_id) WHERE notified = false;
