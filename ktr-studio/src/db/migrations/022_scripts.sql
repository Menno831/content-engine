-- ════════════════════════════════════════════════════════════════
-- Migratie 022: scripts-bibliotheek.
-- Alles wat eerst los op mennokater.nl gehost werd: video-scripts met
-- status (nog schrijven → klaar om op te nemen → opgenomen), optioneel
-- per klant en met een tag (bv. "Mexico") voor trip-voorbereiding.
-- Inline bewerken met autosave op /platform/scripts.
-- ════════════════════════════════════════════════════════════════

create table if not exists scripts (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  client_id  uuid references clients (id) on delete set null,
  title      text not null,
  content    text,
  status     text not null default 'to_write',  -- to_write | to_record | recorded
  tag        text,                              -- bv. 'Mexico' (trip/serie)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_scripts_agency on scripts (agency_id, status, updated_at desc);

alter table scripts enable row level security;
drop policy if exists "read scripts" on scripts;
create policy "read scripts" on scripts
  for select using (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team insert scripts" on scripts;
create policy "team insert scripts" on scripts
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team update scripts" on scripts;
create policy "team update scripts" on scripts
  for update using (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team delete scripts" on scripts;
create policy "team delete scripts" on scripts
  for delete using (agency_id = current_agency_id() and current_client_id() is null);
