-- ============================================
-- NUCLEAR RESET - Drops everything and recreates
-- Run this as ONE script
-- ============================================

-- Step 1: Drop all policies first
DROP POLICY IF EXISTS "View room members" ON room_members;
DROP POLICY IF EXISTS "Owners can add members" ON room_members;
DROP POLICY IF EXISTS "Manage room members" ON room_members;
DROP POLICY IF EXISTS "View accessible chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Anyone can view chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Owners can update rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Owners can delete rooms" ON chat_rooms;
DROP POLICY IF EXISTS "View accessible messages" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can view chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete own messages or admin" ON chat_messages;

-- Step 2: Drop functions (now safe since policies are gone)
DROP FUNCTION IF EXISTS public.is_room_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_room_public(uuid);

-- Step 3: Create helper functions
CREATE OR REPLACE FUNCTION public.is_room_member(check_room_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = check_room_id AND user_id = check_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_room_public(check_room_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT NOT is_private FROM public.chat_rooms WHERE id = check_room_id),
    false
  );
$$;

-- Step 4: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_room_public(uuid) TO authenticated, anon, service_role;

-- Step 5: Create chat_rooms policies
CREATE POLICY "View accessible chat rooms" ON chat_rooms
  FOR SELECT USING (
    is_private = false
    OR is_room_member(id, auth.uid())
  );

CREATE POLICY "Authenticated users can create rooms" ON chat_rooms
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND is_default = false
  );

CREATE POLICY "Owners can update rooms" ON chat_rooms
  FOR UPDATE USING (
    is_room_member(id, auth.uid())
  );

CREATE POLICY "Owners can delete rooms" ON chat_rooms
  FOR DELETE USING (
    is_default = false
    AND created_by = auth.uid()
  );

-- Step 6: Create room_members policies
CREATE POLICY "View room members" ON room_members
  FOR SELECT USING (
    is_room_public(room_id)
    OR is_room_member(room_id, auth.uid())
  );

CREATE POLICY "Owners can add members" ON room_members
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id AND role = 'owner')
    OR EXISTS (
      SELECT 1 FROM room_members rm
      WHERE rm.room_id = room_id
      AND rm.user_id = auth.uid()
      AND rm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Manage room members" ON room_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM room_members rm
      WHERE rm.room_id = room_id
      AND rm.user_id = auth.uid()
      AND rm.role = 'owner'
    )
  );

-- Step 7: Create chat_messages policies
CREATE POLICY "View accessible messages" ON chat_messages
  FOR SELECT USING (
    is_room_public(room_id)
    OR is_room_member(room_id, auth.uid())
  );

CREATE POLICY "Members can send messages" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      is_room_public(room_id)
      OR is_room_member(room_id, auth.uid())
    )
  );

CREATE POLICY "Users can delete own messages or admin" ON chat_messages
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Step 8: Verify everything
SELECT 'Functions created:' as status;
SELECT proname FROM pg_proc WHERE proname IN ('is_room_member', 'is_room_public');

SELECT 'Policies created:' as status;
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('chat_rooms', 'chat_messages', 'room_members')
ORDER BY tablename;
