-- 2026-10-07 THE READ LOCK — NOT YET APPLIED. Apply only AFTER the .728 code is live (the old code reads its own row with
-- select('*'), which this refuses). Rehearsed in a rolled-back transaction 10-07: public face readable (all rows), emails /
-- admin flags / select * refused, my_profile() works, the discussion-name join works, chat delete rule evaluates, name edit works.
revoke select on public.profiles from anon, authenticated;
grant select (id, display_name, avatar_url, bio, created_at) on public.profiles to anon, authenticated;
