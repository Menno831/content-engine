-- ════════════════════════════════════════════════════════════════
-- Migratie 010 — Brand voice intake + opdrachten per klant.
-- 1) Intake: deelbare link (token) + opgeslagen antwoorden.
-- 2) Opdrachten: losse opdrachten met prijs/kosten -> automatische marge.
-- Draai in de Supabase SQL Editor, ná 009 (of na setup.sql).
-- ════════════════════════════════════════════════════════════════

alter table clients add column if not exists intake_token   text unique;
alter table clients add column if not exists intake_answers jsonb;

create table if not exists orders (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  title       text not null,
  deliverables text,                          -- wat moet er gedaan worden
  price       numeric not null default 0,     -- wat de klant betaalt
  editor_cost numeric not null default 0,     -- kosten editor
  other_cost  numeric not null default 0,     -- overige kosten
  status      text not null default 'open',   -- open | bezig | review | klaar | gefactureerd
  deadline    date,
  created_at  timestamptz not null default now()
);

create index if not exists orders_agency_idx on orders (agency_id);
create index if not exists orders_client_idx on orders (client_id);

alter table orders enable row level security;

drop policy if exists "team all orders" on orders;
create policy "team all orders" on orders
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

drop policy if exists "client read own orders" on orders;
create policy "client read own orders" on orders
  for select using (agency_id = current_agency_id() and client_id = current_client_id());
