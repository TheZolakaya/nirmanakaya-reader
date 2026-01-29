-- Collective Readings Schema for Nirmanakaya Reader
-- Stores daily automated readings from the 5 Monitors
-- Run this in Supabase SQL Editor

-- Create the collective_readings table
CREATE TABLE IF NOT EXISTS collective_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Date and Monitor (unique per day per monitor)
  reading_date DATE NOT NULL,
  monitor TEXT NOT NULL CHECK (monitor IN ('global', 'power', 'heart', 'mind', 'body')),
  
  -- Draw data (the cards)
  transient_id INTEGER NOT NULL CHECK (transient_id >= 0 AND transient_id <= 77),
  position_id INTEGER NOT NULL CHECK (position_id >= 0 AND position_id <= 21),
  status_id INTEGER NOT NULL CHECK (status_id >= 1 AND status_id <= 4),
  correction_target_id INTEGER CHECK (correction_target_id >= 0 AND correction_target_id <= 77),
  
  -- Human-readable signature
  signature TEXT NOT NULL,
  
  -- AI interpretation
  interpretation TEXT NOT NULL,
  
  -- Metadata
  model TEXT DEFAULT 'claude-sonnet-4-20250514',
  tokens_used INTEGER DEFAULT 0,
  
  -- Ensure one reading per monitor per day
  UNIQUE(reading_date, monitor)
);

-- Index for efficient date queries
CREATE INDEX IF NOT EXISTS idx_collective_readings_date 
ON collective_readings(reading_date DESC);

-- Index for monitor filtering
CREATE INDEX IF NOT EXISTS idx_collective_readings_monitor 
ON collective_readings(monitor);

-- Index for trend analysis by status
CREATE INDEX IF NOT EXISTS idx_collective_readings_status 
ON collective_readings(status_id);

-- Trend analysis view - shows patterns over time
CREATE OR REPLACE VIEW collective_trends AS
SELECT 
  monitor,
  reading_date,
  transient_id,
  position_id,
  status_id,
  signature,
  -- Previous day's values for comparison
  LAG(status_id) OVER (PARTITION BY monitor ORDER BY reading_date) as prev_status,
  LAG(transient_id) OVER (PARTITION BY monitor ORDER BY reading_date) as prev_transient,
  LAG(position_id) OVER (PARTITION BY monitor ORDER BY reading_date) as prev_position,
  -- Status changed from previous day?
  CASE 
    WHEN LAG(status_id) OVER (PARTITION BY monitor ORDER BY reading_date) != status_id 
    THEN true 
    ELSE false 
  END as status_changed,
  -- Running count of consecutive days with same status
  COUNT(*) OVER (
    PARTITION BY monitor, status_id 
    ORDER BY reading_date 
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) as consecutive_days
FROM collective_readings
ORDER BY monitor, reading_date DESC;

-- Weekly summary view
CREATE OR REPLACE VIEW collective_weekly_summary AS
SELECT 
  monitor,
  DATE_TRUNC('week', reading_date) as week_start,
  COUNT(*) as readings_count,
  -- Most common status this week
  MODE() WITHIN GROUP (ORDER BY status_id) as dominant_status,
  -- Count of each status
  COUNT(*) FILTER (WHERE status_id = 1) as balanced_count,
  COUNT(*) FILTER (WHERE status_id = 2) as too_much_count,
  COUNT(*) FILTER (WHERE status_id = 3) as too_little_count,
  COUNT(*) FILTER (WHERE status_id = 4) as unacknowledged_count
FROM collective_readings
GROUP BY monitor, DATE_TRUNC('week', reading_date)
ORDER BY week_start DESC, monitor;

-- Today's pulse view (convenience)
CREATE OR REPLACE VIEW collective_pulse_today AS
SELECT 
  r.*,
  CASE monitor
    WHEN 'global' THEN '🌍'
    WHEN 'power' THEN '🔥'
    WHEN 'heart' THEN '💧'
    WHEN 'mind' THEN '🌬️'
    WHEN 'body' THEN '🪨'
  END as emoji,
  CASE monitor
    WHEN 'global' THEN 'Global Field'
    WHEN 'power' THEN 'Monitor of Power'
    WHEN 'heart' THEN 'Monitor of Heart'
    WHEN 'mind' THEN 'Monitor of Mind'
    WHEN 'body' THEN 'Monitor of Body'
  END as monitor_name,
  CASE status_id
    WHEN 1 THEN 'Balanced'
    WHEN 2 THEN 'Too Much'
    WHEN 3 THEN 'Too Little'
    WHEN 4 THEN 'Unacknowledged'
  END as status_name
FROM collective_readings r
WHERE reading_date = CURRENT_DATE
ORDER BY 
  CASE monitor
    WHEN 'global' THEN 1
    WHEN 'power' THEN 2
    WHEN 'heart' THEN 3
    WHEN 'mind' THEN 4
    WHEN 'body' THEN 5
  END;

-- RLS Policies (read-only for anonymous, full access for service role)
ALTER TABLE collective_readings ENABLE ROW LEVEL SECURITY;

-- Anyone can read collective readings (public data)
CREATE POLICY "Collective readings are public" 
ON collective_readings 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Only service role can insert/update (via cron job)
CREATE POLICY "Service role can manage readings" 
ON collective_readings 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON collective_readings TO anon, authenticated;
GRANT SELECT ON collective_trends TO anon, authenticated;
GRANT SELECT ON collective_weekly_summary TO anon, authenticated;
GRANT SELECT ON collective_pulse_today TO anon, authenticated;
GRANT ALL ON collective_readings TO service_role;
