-- ════════════════════════════════════════════════════════════════
-- Migratie 052: versies van een script. Elke keer dat je de AI vraagt
-- iets aan te passen bewaren we de opdracht én de vorige tekst, zodat
-- het model weet wat je eerder vroeg en je altijd terug kunt.
-- ════════════════════════════════════════════════════════════════
create table if not exists script_revisions (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies (id) on delete cascade,
  script_id   uuid not null references scripts (id) on delete cascade,
  instruction text,           -- wat jij vroeg (leeg = eerste versie)
  content     text not null,  -- de tekst zoals die was vóór deze opdracht
  created_at  timestamptz not null default now()
);
create index if not exists idx_script_revisions on script_revisions (script_id, created_at desc);

alter table script_revisions enable row level security;
drop policy if exists "team leest scriptversies" on script_revisions;
create policy "team leest scriptversies" on script_revisions
  for select using (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team maakt scriptversies" on script_revisions;
create policy "team maakt scriptversies" on script_revisions
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team verwijdert scriptversies" on script_revisions;
create policy "team verwijdert scriptversies" on script_revisions
  for delete using (agency_id = current_agency_id() and current_client_id() is null);
