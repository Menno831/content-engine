-- ════════════════════════════════════════════════════════════════
-- Migratie 026: de laatste losse eindjes van het agency-OS.
--
-- 1. lead_forms  — publieke leadformulieren. Elk formulier heeft een
--    onraadbare token; inzendingen landen als lead bij de gekoppelde
--    klant (of bij de agency zelf als er geen klant aan hangt).
-- 2. contracts   — welke afspraken lopen, wat ze waard zijn en wanneer
--    ze aflopen.
-- 3. ad_spend    — advertentie-uitgaven per maand, om rendement te
--    kunnen afzetten tegen leads en omzet.
-- ════════════════════════════════════════════════════════════════

create table if not exists lead_forms (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references agencies (id) on delete cascade,
  client_id    uuid references clients (id) on delete set null,
  name         text not null,
  token        text not null unique,
  headline     text,
  intro        text,
  button_label text not null default 'Versturen',
  ask_phone    boolean not null default false,
  ask_instagram boolean not null default true,
  active       boolean not null default true,
  submissions  integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists idx_lead_forms on lead_forms (agency_id, created_at desc);
alter table lead_forms enable row level security;
drop policy if exists "team all lead_forms" on lead_forms;
create policy "team all lead_forms" on lead_forms
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

create table if not exists contracts (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  client_id  uuid references clients (id) on delete set null,
  title      text not null,
  party      text,                                -- tegenpartij / contactpersoon
  value      numeric not null default 0,          -- per maand of eenmalig
  recurring  boolean not null default true,
  status     text not null default 'concept',     -- concept | verstuurd | getekend | verlopen
  starts_on  date,
  ends_on    date,
  doc_url    text,
  notes      text,
  created_at timestamptz not null default now()
);
create index if not exists idx_contracts on contracts (agency_id, status);
alter table contracts enable row level security;
drop policy if exists "team all contracts" on contracts;
create policy "team all contracts" on contracts
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

create table if not exists ad_spend (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  client_id  uuid references clients (id) on delete set null,
  month      date not null,                       -- eerste van de maand
  platform   text not null default 'Instagram',   -- Instagram | YouTube | TikTok | Google
  amount     numeric not null default 0,
  notes      text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ad_spend on ad_spend (agency_id, month desc);
alter table ad_spend enable row level security;
drop policy if exists "team all ad_spend" on ad_spend;
create policy "team all ad_spend" on ad_spend
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);
