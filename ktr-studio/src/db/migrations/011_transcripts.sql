-- ════════════════════════════════════════════════════════════════
-- Migratie 011 — Transcripten per klant (brand voice bron).
-- Ruwe spraak (uit bijv. Transkriptor) is de beste basis voor de
-- brand voice: meerdere transcripten per klant, AI filtert sprekers.
-- Draai in de Supabase SQL Editor, ná 010.
-- ════════════════════════════════════════════════════════════════

create table if not exists transcripts (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  title       text not null default 'Transcript',
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists transcripts_client_idx on transcripts (client_id);

alter table transcripts enable row level security;

drop policy if exists "team all transcripts" on transcripts;
create policy "team all transcripts" on transcripts
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);
