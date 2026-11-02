-- BRIEF 08 item 1, THE FEEDBACK DOOR (2026-11-02): "did this land?" — one row per reading per person. Purely additive; safe to run twice.
-- The route (/api/reading-feedback) writes through the service role and stamps version and prompt_set itself. A signed-in user may insert
-- only their own row, about their own reading, and only the four fields that are theirs to give; nobody but the service role reads the table.
create table if not exists public.reading_feedback (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references public.user_readings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  verdict text not null check (verdict in ('landed', 'partly', 'not_for_me')),
  text text,
  version text,
  prompt_set text,
  created_at timestamptz not null default now(),
  unique (reading_id, user_id)
);
alter table public.reading_feedback enable row level security;
revoke all on table public.reading_feedback from anon, authenticated;
grant insert (reading_id, user_id, verdict, text) on table public.reading_feedback to authenticated;
drop policy if exists "reading_feedback insert own" on public.reading_feedback;
create policy "reading_feedback insert own" on public.reading_feedback
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.user_readings r where r.id = reading_id and r.user_id = auth.uid())
  );
create index if not exists reading_feedback_created_idx on public.reading_feedback (created_at desc);
create index if not exists reading_feedback_version_verdict_idx on public.reading_feedback (version, verdict);
