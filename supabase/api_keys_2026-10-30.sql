-- BRIEF 01, THE KEYED DOOR (2026-10-30): per-caller keys for /api/external-reading and /api/mcp. Purely additive; safe to run twice.
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  key_hash text not null unique,
  shape text not null default 'SEAT' check (shape in ('SEAT', 'DELEGATE')),
  owner text,
  daily_cap integer not null default 20 check (daily_cap >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.api_keys enable row level security;
revoke all on table public.api_keys from anon, authenticated;
alter table public.external_readings add column if not exists api_key_label text;
create index if not exists external_readings_key_label_created_idx on public.external_readings (api_key_label, created_at);
