-- ════════════════════════════════════════════════════════════════
-- Migratie 044: eigen kanalen uitgebreider.
--
-- Per snapshot meer dan alleen volgers en views: aantal video's,
-- likes, reacties, gemiddelde views per video en de best lopende
-- video van dat moment. Daarmee kan een analyse iets zinnigs zeggen.
-- Plus: de eigen website (URL) en een tabel voor site-checks en voor
-- de wekelijkse analyse (bewaard, dus gratis bij een refresh).
-- ════════════════════════════════════════════════════════════════

alter table channel_stats add column if not exists videos    bigint;   -- totaal video's/posts op het kanaal
alter table channel_stats add column if not exists likes     bigint;   -- som over de recentste uploads
alter table channel_stats add column if not exists comments  bigint;
alter table channel_stats add column if not exists avg_views numeric;  -- gemiddelde views per recente upload
alter table channel_stats add column if not exists top_title text;     -- best lopende recente upload
alter table channel_stats add column if not exists top_views bigint;
alter table channel_stats add column if not exists top_url   text;

alter table agencies add column if not exists own_website text;

create table if not exists site_checks (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies (id) on delete cascade,
  url         text not null,
  ok          boolean not null,
  status      int,
  ms          int,                 -- responstijd
  https       boolean,
  title       text,
  description text,
  has_viewport boolean,
  has_canonical boolean,
  has_og_image boolean,
  h1_count    int,
  issues      text[],              -- mensentaal, één per regel
  checked_at  timestamptz not null default now()
);
create index if not exists idx_site_checks on site_checks (agency_id, checked_at desc);
alter table site_checks enable row level security;
drop policy if exists "team all site_checks" on site_checks;
create policy "team all site_checks" on site_checks
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

create table if not exists channel_insights (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  body       text not null,
  model      text,
  created_at timestamptz not null default now()
);
create index if not exists idx_channel_insights on channel_insights (agency_id, created_at desc);
alter table channel_insights enable row level security;
drop policy if exists "team all channel_insights" on channel_insights;
create policy "team all channel_insights" on channel_insights
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);
