-- ════════════════════════════════════════════════════════════════
-- Migratie 003 — Finance (winst per klant/pakket) + editor-beheer
-- (uitbetalingen, deadlines, deducties) + extra content-velden.
-- Draai in de Supabase SQL Editor, ná 001 en 002.
-- ════════════════════════════════════════════════════════════════

-- ── Klant-finance velden (zoals jullie Monday 'Klanten'-board) ──
alter table clients add column if not exists package          text;
alter table clients add column if not exists videos_per_month int  default 0;
alter table clients add column if not exists editor_cost      numeric default 0;
alter table clients add column if not exists payment_status   text default 'open'; -- 'betaald' | 'open' | 'te_laat'

-- ── Editors ─────────────────────────────────────────────────────
create table if not exists editors (
  id            uuid primary key default gen_random_uuid(),
  agency_id     uuid not null references agencies (id) on delete cascade,
  name          text not null,
  email         text,
  pay_per_video numeric default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ── Extra content-velden (Monday: Type, Posting Date, Deadline, editor) ──
alter table content add column if not exists content_type text;
alter table content add column if not exists deadline     date;
alter table content add column if not exists posting_date date;
alter table content add column if not exists editor_id    uuid references editors (id) on delete set null;
alter table content add column if not exists delivered_at timestamptz; -- wanneer de editor aanleverde
alter table content add column if not exists paid         boolean not null default false;

-- ── RLS editors (alleen owner/team) ─────────────────────────────
alter table editors enable row level security;

create policy "read editors" on editors
  for select using (agency_id = current_agency_id() and current_client_id() is null);
create policy "team insert editors" on editors
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);
create policy "team update editors" on editors
  for update using (agency_id = current_agency_id() and current_client_id() is null);
