-- ============================================
-- SIMPLE FIX - NO CUSTOM FUNCTIONS
-- Uses subqueries instead of SECURITY DEFINER functions
-- Run this if the function approach doesn't work
-- ============================================

-- Disable RLS temporarily to reset everything
ALTER TABLE public.room_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "View room members" ON public.room_members;
DROP POLICY IF EXISTS "Owners can add members" ON public.room_members;
DROP POLICY IF EXISTS "Manage room members" ON public.room_members;
DROP POLICY IF EXISTS "View accessible chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Anyone can view chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Owners can update rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Owners can delete rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "View accessible messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete own messages or admin" ON public.chat_messages;

-- Re-enable RLS
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SIMPLE CHAT ROOMS POLICY
-- Public rooms are visible to all, private rooms to members
-- ============================================
CREATE POLICY "View accessible chat rooms" ON public.chat_rooms
  FOR SELECT USING (
    is_private = false
    OR created_by = auth.uid()
    OR id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create rooms" ON public.chat_rooms
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND is_default = false
  );

CREATE POLICY "Owners can update rooms" ON public.chat_rooms
  FOR UPDATE USING (
    created_by = auth.uid()
    OR id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Owners can delete rooms" ON public.chat_rooms
  FOR DELETE USING (
    is_default = false
    AND (
      created_by = auth.uid()
      OR id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid() AND role = 'owner')
    )
  );

-- ============================================
-- SIMPLE ROOM MEMBERS POLICY
-- ============================================
CREATE POLICY "View room members" ON public.room_members
  FOR SELECT USING (
    -- Can see members of rooms you're in
    room_id IN (SELECT rm.room_id FROM public.room_members rm WHERE rm.user_id = auth.uid())
    -- Or members of public rooms
    OR room_id IN (SELECT id FROM public.chat_rooms WHERE is_private = false)
  );

CREATE POLICY "Owners can add members" ON public.room_members
  FOR INSERT WITH CHECK (
    -- Self-insert as owner when creating room
    (auth.uid() = user_id AND role = 'owner')
    -- Or owners/admins can add others
    OR room_id IN (
      SELECT rm.room_id FROM public.room_members rm
      WHERE rm.user_id = auth.uid() AND rm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Manage room members" ON public.room_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR room_id IN (
      SELECT rm.room_id FROM public.room_members rm
      WHERE rm.user_id = auth.uid() AND rm.role = 'owner'
    )
  );

-- ============================================
-- SIMPLE CHAT MESSAGES POLICY
-- ============================================
CREATE POLICY "View accessible messages" ON public.chat_messages
  FOR SELECT USING (
    -- Messages in public rooms
    room_id IN (SELECT id FROM public.chat_rooms WHERE is_private = false)
    -- Or messages in rooms you're a member of
    OR room_id IN (SELECT rm.room_id FROM public.room_members rm WHERE rm.user_id = auth.uid())
  );

CREATE POLICY "Members can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Public rooms
      room_id IN (SELECT id FROM public.chat_rooms WHERE is_private = false)
      -- Or rooms you're a member of
      OR room_id IN (SELECT rm.room_id FROM public.room_members rm WHERE rm.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own messages or admin" ON public.chat_messages
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Verify policies were created
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('chat_rooms', 'chat_messages', 'room_members')
ORDER BY tablename, policyname;
