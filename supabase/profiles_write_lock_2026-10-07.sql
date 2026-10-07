-- 2026-10-07 THE WRITE LOCK (applied live 2026-10-07 as migration profiles_write_lock_2026_10_07)
-- A signed-in user could set their own is_admin / is_banned / daily_token_limit: the row rule
-- ("Users can update own profile", auth.uid() = id) allowed the row, and nothing limited the columns.
-- Row rules decide WHICH rows; column grants decide WHICH fields. Server routes use the service role
-- and are unaffected. Proven before (allowed) and after (refused) as role authenticated, rolled back.
revoke insert, update on public.profiles from anon, authenticated;

grant insert (id, display_name, avatar_url, bio) on public.profiles to authenticated;

grant update (id, display_name, avatar_url, bio, preferences, notification_prefs, last_hub_visit,
              email_welcome, email_readings, email_replies, email_updates, updated_at)
  on public.profiles to authenticated;

-- the chat delete rule read profiles.is_admin as the caller; route it through the definer function
-- so the coming read lock (column grants on SELECT) doesn't break it
alter policy "Users can delete own messages or admin" on public.chat_messages
  using ((auth.uid() = user_id) or public.is_admin());

alter function public.is_admin() set search_path = public;
