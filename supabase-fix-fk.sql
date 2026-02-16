-- ============================================
-- FIX: Add foreign key from chat_messages to profiles
-- This allows PostgREST to resolve the join
-- ============================================

-- Add FK from chat_messages.user_id to profiles.id
-- (profiles.id is the same as auth.users.id, so this is safe)
ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Also add FK from room_members.user_id to profiles.id for consistency
ALTER TABLE room_members
ADD CONSTRAINT room_members_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Verify
SELECT 'Foreign keys added' as status;
