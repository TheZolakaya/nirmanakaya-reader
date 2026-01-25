-- ============================================
-- PRIVATE ROOMS FIX - RLS CIRCULAR DEPENDENCY
-- Run this AFTER supabase-chat-private.sql
-- Fixes the circular dependency between room_members and chat_rooms policies
-- ============================================

-- Create a security definer function to check room membership
-- This bypasses RLS to avoid circular dependency
CREATE OR REPLACE FUNCTION is_room_member(check_room_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM room_members
    WHERE room_id = check_room_id AND user_id = check_user_id
  );
$$;

-- Create a function to check if room is public (bypasses RLS)
CREATE OR REPLACE FUNCTION is_room_public(check_room_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT NOT is_private FROM chat_rooms WHERE id = check_room_id),
    false
  );
$$;

-- ============================================
-- FIXED ROOM MEMBERS POLICIES
-- ============================================

-- Drop and recreate with simplified logic
DROP POLICY IF EXISTS "View room members" ON room_members;
CREATE POLICY "View room members" ON room_members
  FOR SELECT USING (
    is_room_public(room_id)
    OR is_room_member(room_id, auth.uid())
  );

-- ============================================
-- FIXED CHAT ROOMS POLICIES
-- ============================================

DROP POLICY IF EXISTS "View accessible chat rooms" ON chat_rooms;
CREATE POLICY "View accessible chat rooms" ON chat_rooms
  FOR SELECT USING (
    is_private = false
    OR is_room_member(id, auth.uid())
  );

-- ============================================
-- FIXED CHAT MESSAGES POLICIES
-- ============================================

DROP POLICY IF EXISTS "View accessible messages" ON chat_messages;
CREATE POLICY "View accessible messages" ON chat_messages
  FOR SELECT USING (
    is_room_public(room_id)
    OR is_room_member(room_id, auth.uid())
  );

DROP POLICY IF EXISTS "Members can send messages" ON chat_messages;
CREATE POLICY "Members can send messages" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      is_room_public(room_id)
      OR is_room_member(room_id, auth.uid())
    )
  );

-- ============================================
-- Grant execute permissions
-- ============================================
GRANT EXECUTE ON FUNCTION is_room_member TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_room_public TO authenticated, anon;
