-- ============================================
-- DIAGNOSTIC - Run this to find the actual issue
-- ============================================

-- 1. Check if functions exist (they should based on the error)
SELECT 'FUNCTIONS:' as section;
SELECT proname, pg_get_function_arguments(oid) as args
FROM pg_proc WHERE proname IN ('is_room_member', 'is_room_public');

-- 2. Check current policies
SELECT 'POLICIES:' as section;
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('chat_rooms', 'chat_messages', 'room_members')
ORDER BY tablename;

-- 3. Test a simple query on chat_rooms (should work for public rooms)
SELECT 'CHAT_ROOMS TEST:' as section;
SELECT id, name, is_private, is_default FROM public.chat_rooms LIMIT 3;

-- 4. Check if there's data in room_members
SELECT 'ROOM_MEMBERS COUNT:' as section;
SELECT count(*) as member_count FROM public.room_members;
