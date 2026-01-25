-- ============================================
-- REAL-TIME CHAT SYSTEM
-- Run this in Supabase SQL Editor
-- ============================================

-- Chat rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created
  ON chat_messages(room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user
  ON chat_messages(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat rooms: anyone can view
DROP POLICY IF EXISTS "Anyone can view chat rooms" ON chat_rooms;
CREATE POLICY "Anyone can view chat rooms" ON chat_rooms
  FOR SELECT USING (true);

-- Chat messages: anyone can view
DROP POLICY IF EXISTS "Anyone can view chat messages" ON chat_messages;
CREATE POLICY "Anyone can view chat messages" ON chat_messages
  FOR SELECT USING (true);

-- Chat messages: authenticated users can send
DROP POLICY IF EXISTS "Authenticated users can send messages" ON chat_messages;
CREATE POLICY "Authenticated users can send messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat messages: users can delete own, admins can delete any
DROP POLICY IF EXISTS "Users can delete own messages or admin" ON chat_messages;
CREATE POLICY "Users can delete own messages or admin" ON chat_messages
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================
-- DEFAULT ROOMS
-- ============================================

INSERT INTO chat_rooms (name, slug, description, is_default, sort_order)
VALUES
  ('General', 'general', 'General discussion and community chat', true, 0),
  ('Readings', 'readings', 'Talk about readings and interpretations', false, 1),
  ('Help', 'help', 'Questions and support', false, 2)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- ENABLE REAL-TIME
-- ============================================

-- This enables real-time subscriptions for chat_messages
-- Note: You may need to run this in the Supabase Dashboard
-- under Database > Replication > Tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
