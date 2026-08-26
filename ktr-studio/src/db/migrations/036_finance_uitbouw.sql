-- ════════════════════════════════════════════════════════════════
-- Migratie 036: Finance-uitbouw.
-- 1. month_goals: klikbare omzetdoelen per komende maand.
-- 2. expense_links: bankmutaties (uit Moneybird) toegewezen aan een
--    klant / vaste last / privé — de wekelijkse uitgaven-triage.
-- 3. agencies.reserve_config: door Menno zelf ingestelde percentages
--    voor de potjes (belasting/buffer/overig).
-- ════════════════════════════════════════════════════════════════

create table if not exists month_goals (
  agency_id uuid not null references agencies(id) on delete cascade,
  month     text not null, -- 'YYYY-MM'
  goal      numeric not null default 0,
  note      text,
  primary key (agency_id, month)
);
alter table month_goals enable row level security;
drop policy if exists month_goals_rw on month_goals;
create policy month_goals_rw on month_goals
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

create table if not exists expense_links (
  id        text primary key,          -- Moneybird financial_mutation id
  agency_id uuid not null references agencies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  kind      text not null default 'overig', -- klant | vast | prive | overig
  label     text,
  amount    numeric not null default 0,
  mutation_date date,
  created_at timestamptz not null default now()
);
alter table expense_links enable row level security;
drop policy if exists expense_links_rw on expense_links;
create policy expense_links_rw on expense_links
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

alter table agencies add column if not exists reserve_config jsonb;
