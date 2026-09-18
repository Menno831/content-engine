-- ════════════════════════════════════════════════════════════════
-- Migratie 045: Google Agenda importeren.
--
-- Via het geheime iCal-adres van de agenda (geen OAuth, geen review):
-- elke ochtend en op knopdruk worden de afspraken in `meetings` gezet.
-- external_id houdt het idempotent; source zegt waar een afspraak
-- vandaan komt zodat handmatige en geïmporteerde uit elkaar blijven.
-- ════════════════════════════════════════════════════════════════

alter table meetings add column if not exists external_id text;
alter table meetings add column if not exists source      text not null default 'handmatig';  -- handmatig | google
alter table meetings add column if not exists ends_at     timestamptz;
create unique index if not exists idx_meetings_external
  on meetings (agency_id, external_id) where external_id is not null;

alter table agencies add column if not exists calendar_ics_url text;
alter table agencies add column if not exists calendar_synced_at timestamptz;
