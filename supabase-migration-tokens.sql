-- =====================================================
-- TOKEN TRACKING MIGRATION
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add token tracking to readings table
ALTER TABLE public.readings
ADD COLUMN IF NOT EXISTS input_tokens integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS output_tokens integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tokens integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_cost numeric(10,6) DEFAULT 0;

-- Add cumulative token tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_input_tokens bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_output_tokens bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_readings integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost numeric(12,6) DEFAULT 0;

-- Create a function to update profile totals when a reading is saved
CREATE OR REPLACE FUNCTION update_profile_token_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET
    total_input_tokens = total_input_tokens + NEW.input_tokens,
    total_output_tokens = total_output_tokens + NEW.output_tokens,
    total_readings = total_readings + 1,
    total_cost = total_cost + NEW.estimated_cost,
    updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update totals
DROP TRIGGER IF EXISTS on_reading_created ON public.readings;
CREATE TRIGGER on_reading_created
  AFTER INSERT ON public.readings
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_token_totals();

-- Done!
-- Now readings will track their own tokens,
-- and profiles will track cumulative usage.
