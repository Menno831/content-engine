-- ════════════════════════════════════════════════════════════════
-- Migratie 051: kosten per maand die niet aan één factuur hangen —
-- editfacturen van je vaste editor, losse software, eenmalige uitgaven.
-- Zo klopt de kostenhistorie ook voor maanden waarin je de kosten niet
-- per factuur hebt ingevuld.
-- kind: 'edit' | 'software' | 'overig'
-- ════════════════════════════════════════════════════════════════
create table if not exists monthly_costs (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  month      date not null,               -- altijd de 1e van de maand
  kind       text not null default 'overig',
  label      text not null,
  amount     numeric not null default 0,  -- in euro, excl. btw waar bekend
  source     text,                        -- waar het vandaan komt
  created_at timestamptz not null default now(),
  unique (agency_id, month, label)
);
create index if not exists idx_monthly_costs on monthly_costs (agency_id, month);

alter table monthly_costs enable row level security;
drop policy if exists "team leest maandkosten" on monthly_costs;
create policy "team leest maandkosten" on monthly_costs
  for select using (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team maakt maandkosten" on monthly_costs;
create policy "team maakt maandkosten" on monthly_costs
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team werkt maandkosten bij" on monthly_costs;
create policy "team werkt maandkosten bij" on monthly_costs
  for update using (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team verwijdert maandkosten" on monthly_costs;
create policy "team verwijdert maandkosten" on monthly_costs
  for delete using (agency_id = current_agency_id() and current_client_id() is null);
