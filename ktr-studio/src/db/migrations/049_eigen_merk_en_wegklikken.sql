-- ════════════════════════════════════════════════════════════════
-- Migratie 049: (1) eigen merk als klant — Menno's eigen kanaal staat
-- als klant in de lijst maar heeft geen retainer; de edit-kosten ervan
-- zijn wél echte maandkosten. (2) taken op Finance wegklikken tot het
-- einde van de maand, zodat de lijst alleen laat zien wat nog moet.
-- ════════════════════════════════════════════════════════════════
alter table clients add column if not exists is_own_brand boolean not null default false;

create table if not exists finance_dismissals (
  agency_id  uuid not null references agencies (id) on delete cascade,
  item_key   text not null,
  until      date not null,
  created_at timestamptz not null default now(),
  primary key (agency_id, item_key)
);

alter table finance_dismissals enable row level security;
drop policy if exists "team leest weggeklikte taken" on finance_dismissals;
create policy "team leest weggeklikte taken" on finance_dismissals
  for select using (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team klikt taken weg" on finance_dismissals;
create policy "team klikt taken weg" on finance_dismissals
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team werkt weggeklikte taken bij" on finance_dismissals;
create policy "team werkt weggeklikte taken bij" on finance_dismissals
  for update using (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team haalt taken terug" on finance_dismissals;
create policy "team haalt taken terug" on finance_dismissals
  for delete using (agency_id = current_agency_id() and current_client_id() is null);
