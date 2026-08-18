-- ════════════════════════════════════════════════════════════════
-- Migratie 023: scripts-review + opnamelocatie, outreach-dagteller,
-- kosten per factuur en vaste lasten.
--
-- 1. scripts.location    — waar dit script opgenomen moet worden
--    (bv. 'Mexico', 'België', 'Thuis'), zodat een trip in één filter
--    alle opneembare scripts toont.
-- 2. scripts.review_note — status 'to_review' ("nog aanpassen") komt
--    erbij in de app; deze notitie zegt wát er nog moet gebeuren.
-- 3. prospects.dm_sent_at — gezet zodra een prospect naar
--    'dm_verstuurd' schuift; voedt de "vandaag verstuurd"-teller.
-- 4. invoice_costs — geschatte kosten per Moneybird-factuur (id =
--    Moneybird-factuur-id), zodat Finance winst per factuur toont.
-- 5. fixed_costs — vaste maandlasten van de agency (Claude, bank,
--    Skool, telefoon...), meegenomen in het maandoverzicht.
-- ════════════════════════════════════════════════════════════════

alter table scripts add column if not exists location    text;
alter table scripts add column if not exists review_note text;

alter table prospects add column if not exists dm_sent_at timestamptz;

create table if not exists invoice_costs (
  id         text primary key,               -- Moneybird-factuur-id
  agency_id  uuid not null references agencies (id) on delete cascade,
  cost       numeric not null default 0,
  note       text,
  updated_at timestamptz not null default now()
);
alter table invoice_costs enable row level security;
drop policy if exists "team all invoice_costs" on invoice_costs;
create policy "team all invoice_costs" on invoice_costs
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

create table if not exists fixed_costs (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  name       text not null,
  amount     numeric not null default 0,     -- per maand
  note       text,
  created_at timestamptz not null default now()
);
alter table fixed_costs enable row level security;
drop policy if exists "team all fixed_costs" on fixed_costs;
create policy "team all fixed_costs" on fixed_costs
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

-- 6. editors: delete-policy ontbrak — "Verwijderen" deed anders stilletjes niks.
drop policy if exists "team delete editors" on editors;
create policy "team delete editors" on editors
  for delete using (agency_id = current_agency_id() and current_client_id() is null);

-- 7. todos: persoonlijke taken naast klant-taken — client_id mag leeg,
--    urgency ('vandaag' | 'later') en user_id (van wie de taak is).
alter table todos alter column client_id drop not null;
alter table todos add column if not exists urgency text;
alter table todos add column if not exists user_id uuid;
