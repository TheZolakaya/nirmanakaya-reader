-- ============================================
-- GRANT PERMISSIONS - Functions exist but may not be callable
-- ============================================

-- Grant execute on both functions to all relevant roles
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.is_room_public(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_public(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_room_public(uuid) TO service_role;

-- Also ensure the function owner can access underlying tables
-- (SECURITY DEFINER runs as owner, so owner needs table access)
GRANT SELECT ON public.room_members TO postgres;
GRANT SELECT ON public.chat_rooms TO postgres;

-- Verify grants
SELECT 'FUNCTION PRIVILEGES:' as section;
SELECT
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name IN ('is_room_member', 'is_room_public')
ORDER BY routine_name, grantee;
