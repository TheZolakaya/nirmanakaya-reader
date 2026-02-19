-- 007: Add UPDATE policies for hub discussions and replies (owner + admin)
-- Run this in Supabase SQL Editor

-- Discussions: allow owner or admin to edit
DROP POLICY IF EXISTS "Users can update own discussions" ON discussions;
CREATE POLICY "Users can update own discussions" ON discussions
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

-- Replies: allow owner or admin to edit (no UPDATE policy existed before)
DROP POLICY IF EXISTS "Users can update own replies" ON discussion_replies;
CREATE POLICY "Users can update own replies" ON discussion_replies
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());
