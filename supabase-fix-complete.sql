-- ============================================
-- COMPLETE FIX - RUN THIS ENTIRE SCRIPT AT ONCE
-- Explicitly uses public schema and includes diagnostics
-- ============================================

-- Step 1: Drop any existing broken functions
DROP FUNCTION IF EXISTS public.is_room_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_room_public(uuid);

-- Step 2: Create is_room_member function with explicit schema
CREATE FUNCTION public.is_room_member(check_room_id uuid, check_user_id uuid)
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

-- Step 3: Create is_room_public function with explicit schema
CREATE FUNCTION public.is_room_public(check_room_id uuid)
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
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_room_public(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_public(uuid) TO anon;

-- Step 5: Fix room_members policies
DROP POLICY IF EXISTS "View room members" ON public.room_members;
CREATE POLICY "View room members" ON public.room_members
  FOR SELECT USING (
    public.is_room_public(room_id)
    OR public.is_room_member(room_id, auth.uid())
  );

-- Step 6: Fix chat_rooms policies
DROP POLICY IF EXISTS "View accessible chat rooms" ON public.chat_rooms;
CREATE POLICY "View accessible chat rooms" ON public.chat_rooms
  FOR SELECT USING (
    is_private = false
    OR public.is_room_member(id, auth.uid())
  );

-- Step 7: Fix chat_messages policies
DROP POLICY IF EXISTS "View accessible messages" ON public.chat_messages;
CREATE POLICY "View accessible messages" ON public.chat_messages
  FOR SELECT USING (
    public.is_room_public(room_id)
    OR public.is_room_member(room_id, auth.uid())
  );

DROP POLICY IF EXISTS "Members can send messages" ON public.chat_messages;
CREATE POLICY "Members can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      public.is_room_public(room_id)
      OR public.is_room_member(room_id, auth.uid())
    )
  );

-- Step 8: Verify functions were created
SELECT
  p.proname as function_name,
  n.nspname as schema_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('is_room_member', 'is_room_public')
  AND n.nspname = 'public';
