-- ════════════════════════════════════════════════════════════════
-- Migratie 006 — Outreach-pijplijn (nieuwe klanten werven).
-- Mirrors jullie Monday 'Audit Pipeline – Outreach'. Ná 005.
-- ════════════════════════════════════════════════════════════════

create table if not exists prospects (
  id              uuid primary key default gen_random_uuid(),
  agency_id       uuid not null references agencies (id) on delete cascade,
  name            text not null,
  instagram       text,
  youtube         text,
  weakness        text,                          -- gesignaleerde zwakte
  stage           text not null default 'te_contacteren',
  potential_value numeric default 0,
  note            text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_prospects_agency on prospects (agency_id, stage);

alter table prospects enable row level security;
create policy "read prospects" on prospects
  for select using (agency_id = current_agency_id() and current_client_id() is null);
create policy "team insert prospects" on prospects
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);
create policy "team update prospects" on prospects
  for update using (agency_id = current_agency_id() and current_client_id() is null);
