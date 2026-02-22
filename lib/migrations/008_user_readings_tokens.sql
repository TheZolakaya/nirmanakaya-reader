-- Migration 008: Add token tracking and cost columns to user_readings
-- Unifies readings + user_readings into one table (user_readings wins)
-- Admin stats and cost tracking now query user_readings

-- Token tracking
ALTER TABLE user_readings ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0;
ALTER TABLE user_readings ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0;
ALTER TABLE user_readings ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;
ALTER TABLE user_readings ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC DEFAULT 0;

-- Model used (for accurate cost calculation)
ALTER TABLE user_readings ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'sonnet';

-- Reading question (was 'topic' but admin needs it explicitly)
-- topic column already exists and serves this purpose

-- Mode and spread type (for admin breakdowns)
ALTER TABLE user_readings ADD COLUMN IF NOT EXISTS mode TEXT;
ALTER TABLE user_readings ADD COLUMN IF NOT EXISTS spread_type TEXT;

-- Telemetry
ALTER TABLE user_readings ADD COLUMN IF NOT EXISTS reflect_count INTEGER DEFAULT 0;
ALTER TABLE user_readings ADD COLUMN IF NOT EXISTS forge_count INTEGER DEFAULT 0;
ALTER TABLE user_readings ADD COLUMN IF NOT EXISTS clarify_count INTEGER DEFAULT 0;

-- Service role policy for admin stats (bypasses RLS)
-- The admin stats route uses SUPABASE_SERVICE_ROLE_KEY which already bypasses RLS,
-- so no additional policy needed.

-- Index for admin time-based queries
CREATE INDEX IF NOT EXISTS idx_user_readings_created
  ON user_readings(created_at DESC);
