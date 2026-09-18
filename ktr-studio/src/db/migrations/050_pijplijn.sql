-- ════════════════════════════════════════════════════════════════
-- Migratie 050: deals in de pijplijn. Klanten waar je serieus mee in
-- gesprek bent tellen gewogen mee in de vooruitblik: een voorstel dat
-- er ligt is geen omzet, maar ook geen nul. De kans hangt aan de fase,
-- zodat je niets extra hoeft in te schatten.
-- ════════════════════════════════════════════════════════════════
create table if not exists deals (
  id            uuid primary key default gen_random_uuid(),
  agency_id     uuid not null references agencies (id) on delete cascade,
  name          text not null,
  monthly_value numeric not null default 0,
  currency      text not null default 'EUR',
  stage         text not null default 'gesprek',  -- gesprek | voorstel | mondeling_ja | gewonnen | verloren
  starts_month  date,                             -- eerste maand dat het meetelt
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_deals_agency on deals (agency_id, stage);

alter table deals enable row level security;
drop policy if exists "team leest deals" on deals;
create policy "team leest deals" on deals
  for select using (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team maakt deals" on deals;
create policy "team maakt deals" on deals
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team werkt deals bij" on deals;
create policy "team werkt deals bij" on deals
  for update using (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team verwijdert deals" on deals;
create policy "team verwijdert deals" on deals
  for delete using (agency_id = current_agency_id() and current_client_id() is null);
