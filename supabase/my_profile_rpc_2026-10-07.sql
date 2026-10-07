-- 2026-10-07 (applied live as migration my_profile_rpc_2026_10_07): your OWN full profile row, for the read lock.
create or replace function public.my_profile()
returns setof public.profiles
language sql stable security definer
set search_path = public
as $$ select * from public.profiles where id = auth.uid() $$;
revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;
