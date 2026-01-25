-- ============================================
-- PRIVATE ROOMS & USER-CREATED ROOMS
-- Run this AFTER supabase-chat.sql
-- ============================================

-- Add private room support to chat_rooms
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Room members table for private room access
CREATE TABLE IF NOT EXISTS room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Index for fast membership lookups
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);

-- ============================================
-- ROW LEVEL SECURITY FOR ROOM MEMBERS
-- ============================================

ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;

-- Anyone can view members of public rooms, only members can view private room members
DROP POLICY IF EXISTS "View room members" ON room_members;
CREATE POLICY "View room members" ON room_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms r
      WHERE r.id = room_id
      AND (
        r.is_private = false
        OR EXISTS (
          SELECT 1 FROM room_members rm
          WHERE rm.room_id = room_id AND rm.user_id = auth.uid()
        )
      )
    )
  );

-- Room owners/admins can add members
DROP POLICY IF EXISTS "Owners can add members" ON room_members;
CREATE POLICY "Owners can add members" ON room_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_members rm
      WHERE rm.room_id = room_id
      AND rm.user_id = auth.uid()
      AND rm.role IN ('owner', 'admin')
    )
    OR (
      -- Allow self-insert when creating room (invited_by is null for owner)
      auth.uid() = user_id AND role = 'owner'
    )
  );

-- Room owners can remove members, members can leave
DROP POLICY IF EXISTS "Manage room members" ON room_members;
CREATE POLICY "Manage room members" ON room_members
  FOR DELETE USING (
    auth.uid() = user_id -- Can remove self (leave)
    OR EXISTS (
      SELECT 1 FROM room_members rm
      WHERE rm.room_id = room_id
      AND rm.user_id = auth.uid()
      AND rm.role = 'owner'
    )
  );

-- ============================================
-- UPDATED CHAT ROOM POLICIES
-- ============================================

-- Drop old policy
DROP POLICY IF EXISTS "Anyone can view chat rooms" ON chat_rooms;

-- View rooms: public rooms visible to all, private only to members
CREATE POLICY "View accessible chat rooms" ON chat_rooms
  FOR SELECT USING (
    is_private = false
    OR EXISTS (
      SELECT 1 FROM room_members rm
      WHERE rm.room_id = id AND rm.user_id = auth.uid()
    )
  );

-- Authenticated users can create rooms
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON chat_rooms;
CREATE POLICY "Authenticated users can create rooms" ON chat_rooms
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND is_default = false  -- Only system can create default rooms
  );

-- Room owners can update their rooms
DROP POLICY IF EXISTS "Owners can update rooms" ON chat_rooms;
CREATE POLICY "Owners can update rooms" ON chat_rooms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM room_members rm
      WHERE rm.room_id = id
      AND rm.user_id = auth.uid()
      AND rm.role = 'owner'
    )
  );

-- Room owners can delete their rooms (not default rooms)
DROP POLICY IF EXISTS "Owners can delete rooms" ON chat_rooms;
CREATE POLICY "Owners can delete rooms" ON chat_rooms
  FOR DELETE USING (
    is_default = false
    AND EXISTS (
      SELECT 1 FROM room_members rm
      WHERE rm.room_id = id
      AND rm.user_id = auth.uid()
      AND rm.role = 'owner'
    )
  );

-- ============================================
-- UPDATED CHAT MESSAGE POLICIES
-- ============================================

-- Drop old policy
DROP POLICY IF EXISTS "Anyone can view chat messages" ON chat_messages;

-- View messages: public room messages visible to all, private only to members
CREATE POLICY "View accessible messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms r
      WHERE r.id = room_id
      AND (
        r.is_private = false
        OR EXISTS (
          SELECT 1 FROM room_members rm
          WHERE rm.room_id = room_id AND rm.user_id = auth.uid()
        )
      )
    )
  );

-- Update send policy: must be member of private rooms
DROP POLICY IF EXISTS "Authenticated users can send messages" ON chat_messages;
CREATE POLICY "Members can send messages" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM chat_rooms r
      WHERE r.id = room_id
      AND (
        r.is_private = false
        OR EXISTS (
          SELECT 1 FROM room_members rm
          WHERE rm.room_id = room_id AND rm.user_id = auth.uid()
        )
      )
    )
  );

-- ============================================
-- ENABLE REAL-TIME FOR ROOM MEMBERS
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE room_members;
