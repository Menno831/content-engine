-- ════════════════════════════════════════════════════════════════
-- Migratie 041: content-ideeën met hun bron.
--
-- idea_sources = het ruwe materiaal waar ideeën uit komen: samen-
-- vattingen van calls (Fathom), gesprekken, notities. Eén rij per
-- bron, met een link terug zodat je altijd kunt nalezen waar een
-- idee vandaan komt.
--
-- content_ideas = de ideeën zelf. Elk idee draagt z'n bron, zodat
-- "waarom dit idee" nooit een black box is. Status loopt van nieuw
-- naar gemaakt; "gemaakt" betekent dat er een script van is.
-- ════════════════════════════════════════════════════════════════

create table if not exists idea_sources (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  kind       text not null default 'call',   -- call | notitie | chat | transcript
  title      text not null,
  happened_on date,
  url        text,                            -- terug naar de opname
  content    text not null,                   -- samenvatting of ruwe tekst
  created_at timestamptz not null default now()
);
create index if not exists idx_idea_sources on idea_sources (agency_id, happened_on desc);

alter table idea_sources enable row level security;
drop policy if exists "team all idea_sources" on idea_sources;
create policy "team all idea_sources" on idea_sources
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

create table if not exists content_ideas (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  client_id  uuid references clients (id) on delete cascade,  -- leeg = eigen kanaal
  title      text not null,
  hook       text,                              -- de opening, letterlijk bruikbaar
  angle      text,                              -- waarom dit werkt / wat erin moet
  pillar     text,                              -- Value | Documentation | Lifestyle
  format     text,                              -- Reel | Carrousel | Longform | Story
  source_id  uuid references idea_sources (id) on delete set null,
  source_note text,                             -- korte bronvermelding in mensentaal
  status     text not null default 'nieuw',     -- nieuw | gekozen | gemaakt | afgewezen
  script_id  uuid references scripts (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_content_ideas on content_ideas (agency_id, status, created_at desc);

alter table content_ideas enable row level security;
drop policy if exists "team all content_ideas" on content_ideas;
create policy "team all content_ideas" on content_ideas
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);
