-- THE POUR — the table of truth (founder 2026-10-02). Every set ever poured, every cell with its provenance; one config row says
-- which set is live. The Reader never reads this table on the reading path: scripts/pour_snapshot.mjs cuts the live set into
-- data/pour/snapshot (78 files) at build time and that is what serves. Run this once in the Supabase SQL editor.

create table if not exists pour_cells (
  id             bigserial primary key,
  set_key        text not null,                 -- 'a' … 'l' (the wave / prompt lineage)
  author         text not null,                 -- 'or-v4.1-flash', 'claude-fable-5-1' …
  prompt_version text not null,                 -- 'pour-author-2026-10-02-l'
  schema_version text not null,                 -- '0.5'
  signature_id   smallint not null check (signature_id between 0 and 77),
  position_id    smallint not null check (position_id between 0 and 21),
  status         smallint not null check (status between 1 and 4),
  partner_id     smallint,                      -- the medicine partner the record computed at authoring time
  partner        text,
  mechanism      text,                          -- growth | diagonal | vertical | reduction
  tense          text not null,
  verb           text not null,
  place          text not null,
  ask            text not null,
  core           text not null,
  sheet_line     text not null,
  attempts       smallint not null default 1,
  hard_open      smallint not null default 0,   -- hard lint flags still open after the last attempt (0 = clean)
  lint           jsonb not null default '[]',
  authored_at    timestamptz not null default now(),
  unique (set_key, signature_id, position_id, status)
);

create index if not exists pour_cells_lookup on pour_cells (set_key, signature_id, position_id, status);

create table if not exists pour_config (
  key   text primary key,
  value text not null,
  note  text,
  updated_at timestamptz not null default now()
);

insert into pour_config (key, value, note) values ('live_set', 'l', 'the set the snapshot is cut from') on conflict (key) do nothing;

-- the judges' picks, by cell (a row per judge per cell), so a pick can point at a row
create table if not exists pour_picks (
  id           bigserial primary key,
  cell_id      bigint references pour_cells(id) on delete cascade,
  judge        text not null,                   -- 'Keel', 'Fresh Mind', 'New Seat', 'founder', 'stranger:gemini' …
  true_        text,                            -- Y / N / U
  room         text,                            -- Y / N
  kitchen      text,                            -- free text
  note         text,
  picked_at    timestamptz not null default now()
);

-- the service role may write; anon may read the live set only (the snapshot is the public path anyway)
alter table pour_cells enable row level security;
alter table pour_config enable row level security;
alter table pour_picks enable row level security;
create policy if not exists pour_cells_read_live on pour_cells for select using (set_key = (select value from pour_config where key = 'live_set'));
create policy if not exists pour_config_read on pour_config for select using (true);
