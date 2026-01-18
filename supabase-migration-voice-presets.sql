-- =====================================================
-- NIRMANAKAYA READER - VOICE PRESETS TABLE
-- Migration for voice testing infrastructure
-- Run this in your Supabase SQL Editor (Database > SQL Editor)
-- =====================================================

-- =====================
-- VOICE PRESETS TABLE
-- =====================
-- Stores the 16 Royal voice presets for the Reader
-- Each Royal (Page/Knight/Queen/King x Wands/Swords/Cups/Coins) has a governing archetype

CREATE TABLE IF NOT EXISTS public.voice_presets (
  id SERIAL PRIMARY KEY,
  royal_key VARCHAR(50) UNIQUE NOT NULL,
  preset_name VARCHAR(100) NOT NULL,
  governor VARCHAR(50) NOT NULL,
  governor_number INTEGER NOT NULL,

  -- Voice configuration settings
  delivery VARCHAR(20),           -- Clear | Kind | Playful | Wise | Oracle
  speak_like VARCHAR(20),         -- Friend | Guide | Teacher | Mentor | Master
  tone VARCHAR(20),               -- Playful | Light | Balanced | Earnest | Grave
  voice VARCHAR(20),              -- Wonder | Warm | Direct | Grounded
  focus VARCHAR(20),              -- Do | Feel | See | Build
  density VARCHAR(20),            -- Luminous | Rich | Clear | Essential
  scope VARCHAR(20),              -- Resonant | Patterned | Connected | Here
  direct_mode BOOLEAN DEFAULT false,

  -- UI and testing
  preview_phrase TEXT,            -- Static preview for UI display
  signature_phrase TEXT,          -- Sample opener for this voice
  avoid_patterns TEXT,            -- What this voice should never say

  -- Status
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups by royal_key
CREATE INDEX IF NOT EXISTS voice_presets_royal_key_idx ON public.voice_presets(royal_key);
CREATE INDEX IF NOT EXISTS voice_presets_active_idx ON public.voice_presets(active);

-- Enable RLS (public read, admin write)
ALTER TABLE public.voice_presets ENABLE ROW LEVEL SECURITY;

-- Anyone can read active presets
CREATE POLICY "Anyone can read active voice presets" ON public.voice_presets
  FOR SELECT USING (active = true);

-- Admins can manage presets (requires admin role setup)
-- For now, service role key can insert/update directly

-- =====================
-- SEED DATA: 16 Royal Voice Presets
-- =====================
-- Initial seed with royal_key, preset_name, governor, and governor_number
-- Voice config columns will be populated after testing

INSERT INTO public.voice_presets (royal_key, preset_name, governor, governor_number) VALUES
  -- PAGES (Spirit Domain) - Fresh, receptive, beginning
  ('page-of-wands', 'The Starlight Voice', 'Inspiration', 17),
  ('page-of-swords', 'The Priestess Voice', 'Wisdom', 2),
  ('page-of-cups', 'The Moonlit Voice', 'Imagination', 18),
  ('page-of-coins', 'The Empress Voice', 'Nurturing', 3),

  -- KNIGHTS (Mind Domain) - Active, testing, applying
  ('knight-of-wands', 'The Emperor Voice', 'Order', 4),
  ('knight-of-swords', 'The Mechanism Voice', 'Abstraction', 15),
  ('knight-of-cups', 'The Hierophant Voice', 'Culture', 5),
  ('knight-of-coins', 'The Tower Voice', 'Breakthrough', 16),

  -- QUEENS (Emotion Domain) - Holding, sustaining, mature
  ('queen-of-wands', 'The Chariot Voice', 'Drive', 7),
  ('queen-of-swords', 'The Temperance Voice', 'Balance', 14),
  ('queen-of-cups', 'The Lovers Voice', 'Compassion', 6),
  ('queen-of-coins', 'The Threshold Voice', 'Change', 13),

  -- KINGS (Body Domain) - Decisive, authoritative, embodied
  ('king-of-wands', 'The Surrender Voice', 'Sacrifice', 12),
  ('king-of-swords', 'The Hermit Voice', 'Discipline', 9),
  ('king-of-cups', 'The Justice Voice', 'Equity', 11),
  ('king-of-coins', 'The Strength Voice', 'Fortitude', 8)
ON CONFLICT (royal_key) DO NOTHING;

-- =====================
-- UPDATE TRIGGER
-- =====================
-- Auto-update updated_at timestamp

CREATE OR REPLACE FUNCTION public.update_voice_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS voice_presets_updated_at ON public.voice_presets;
CREATE TRIGGER voice_presets_updated_at
  BEFORE UPDATE ON public.voice_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_voice_presets_updated_at();

-- =====================
-- DONE!
-- =====================
-- After running this migration:
-- 1. Verify 16 rows exist: SELECT * FROM voice_presets;
-- 2. Set ALLOW_FIXED_DRAW=true in test environment
-- 3. Run voice tests from Claude chat
-- 4. Update voice config columns as presets are locked
