-- ════════════════════════════════════════════════════════════════
-- Migratie 034: Frame.io-koppeling.
-- We onthouden welke uploads al gezien zijn (anders elke run
-- dezelfde melding) en welk Frame.io-project bij de agency hoort.
-- ════════════════════════════════════════════════════════════════

create table if not exists frameio_seen (
  id      text primary key,          -- Frame.io file-id
  name    text,
  seen_at timestamptz not null default now()
);
alter table frameio_seen enable row level security;

alter table agencies add column if not exists frameio_project_id text;
