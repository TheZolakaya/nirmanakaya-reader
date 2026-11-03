-- BRIEF 08 item 1, THE FEEDBACK DOOR (2026-11-02): "did this land?" — one row per reading per person. Purely additive; safe to run twice.
-- The route (/api/reading-feedback) is the only way in: it checks the caller owns the reading, stamps version and prompt_set itself, and
-- writes through the service role. Users have no direct path: RLS on, no policies, and nothing granted to anon or authenticated, so they
-- can neither write nor read the table; the admin console reads it through the service role.
create table if not exists public.reading_feedback (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references public.user_readings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  verdict text not null check (verdict in ('landed', 'partly', 'not_for_me')),
  text text check (text is null or char_length(text) <= 4000),
  version text,
  prompt_set text,
  created_at timestamptz not null default now(),
  unique (reading_id, user_id)
);
alter table public.reading_feedback enable row level security;
revoke all on table public.reading_feedback from anon, authenticated;
drop policy if exists "reading_feedback insert own" on public.reading_feedback;
create index if not exists reading_feedback_created_idx on public.reading_feedback (created_at desc);
create index if not exists reading_feedback_version_verdict_idx on public.reading_feedback (version, verdict);
