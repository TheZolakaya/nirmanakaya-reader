-- Collective Pulse v2 Schema Migration
-- Run this in Supabase SQL Editor
-- Adds: voice column, throughline column, reading_time, pulse_settings table
-- IMPORTANT: Run AFTER deploying the v2 code

-- 1. Add reading_time column (timestamp for sub-daily frequency support)
ALTER TABLE collective_readings
ADD COLUMN IF NOT EXISTS reading_time TIMESTAMPTZ DEFAULT NOW();

-- Backfill reading_time from reading_date for existing rows
UPDATE collective_readings
SET reading_time = reading_date::timestamptz + interval '6 hours'
WHERE reading_time IS NULL OR reading_time = NOW();

-- 2. Add voice column (supports multiple voice variants per reading)
ALTER TABLE collective_readings
ADD COLUMN IF NOT EXISTS voice TEXT DEFAULT 'default';

-- 3. Add throughline column (cross-monitor synthesis, stored on global row)
ALTER TABLE collective_readings
ADD COLUMN IF NOT EXISTS throughline TEXT;

-- 4. Drop old unique constraint and add new one with voice
ALTER TABLE collective_readings
DROP CONSTRAINT IF EXISTS collective_readings_reading_date_monitor_key;

ALTER TABLE collective_readings
ADD CONSTRAINT collective_readings_date_monitor_voice_key
  UNIQUE(reading_date, monitor, voice);

-- 5. New indexes
CREATE INDEX IF NOT EXISTS idx_collective_readings_voice
ON collective_readings(voice);

CREATE INDEX IF NOT EXISTS idx_collective_readings_time
ON collective_readings(reading_time DESC);

-- 6. Create pulse_settings table (singleton pattern)
CREATE TABLE IF NOT EXISTS pulse_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Generation settings
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('hourly', '6hour', 'daily', 'weekly')),
  default_voice TEXT DEFAULT 'default',
  auto_generate BOOLEAN DEFAULT true,

  -- Last generation timestamp
  last_generated_at TIMESTAMPTZ,

  -- Singleton pattern: only one row allowed
  singleton BOOLEAN DEFAULT true UNIQUE CHECK (singleton = true)
);

-- Insert default settings row (no-op if exists)
INSERT INTO pulse_settings (frequency, default_voice, auto_generate, singleton)
VALUES ('daily', 'default', true, true)
ON CONFLICT (singleton) DO NOTHING;

-- 7. RLS for pulse_settings
ALTER TABLE pulse_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pulse settings readable by authenticated"
ON pulse_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Service role manages pulse settings"
ON pulse_settings FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 8. Grant permissions
GRANT SELECT ON pulse_settings TO authenticated;
GRANT ALL ON pulse_settings TO service_role;

-- 9. Update the today view to include new columns
DROP VIEW IF EXISTS collective_pulse_today;
CREATE VIEW collective_pulse_today AS
SELECT
  r.*,
  CASE monitor
    WHEN 'global' THEN 'Global Field'
    WHEN 'power' THEN 'Governance & Power'
    WHEN 'heart' THEN 'Culture & Belonging'
    WHEN 'mind' THEN 'Systems & Technology'
    WHEN 'body' THEN 'Earth & Health'
  END as public_name
FROM collective_readings r
WHERE reading_date = CURRENT_DATE
  AND voice = 'default'
ORDER BY
  CASE monitor
    WHEN 'global' THEN 1
    WHEN 'power' THEN 2
    WHEN 'heart' THEN 3
    WHEN 'mind' THEN 4
    WHEN 'body' THEN 5
  END;
