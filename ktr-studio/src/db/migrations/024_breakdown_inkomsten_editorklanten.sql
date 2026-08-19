-- ════════════════════════════════════════════════════════════════
-- Migratie 024: factuur-kostenbreakdown, overige inkomsten per
-- maand, en editors gekoppeld aan specifieke klanten.
--
-- 1. invoice_costs.breakdown — kostenregels per factuur als jsonb
--    [{label, amount}] (edits, thumbnails, postkosten...); cost
--    blijft de som zodat bestaande weergaven blijven werken.
-- 2. other_income — inkomsten die nooit gefactureerd zijn (bv.
--    crypto in jan/feb), per maand, zodat het maandoverzicht klopt.
-- 3. editors.client_ids — op welke klant(en) een editor zit; een
--    editor-login ziet alleen het board van die klanten.
-- ════════════════════════════════════════════════════════════════

alter table invoice_costs add column if not exists breakdown jsonb;

create table if not exists other_income (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  month      date not null,               -- eerste van de maand
  label      text not null,
  amount     numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_other_income on other_income (agency_id, month);
alter table other_income enable row level security;
drop policy if exists "team all other_income" on other_income;
create policy "team all other_income" on other_income
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

alter table editors add column if not exists client_ids uuid[];
