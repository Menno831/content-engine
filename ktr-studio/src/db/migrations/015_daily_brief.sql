-- ════════════════════════════════════════════════════════════════
-- Migratie 015 — Daily Brief: dagelijkse content-ideeën per klant.
-- Elke ochtend genereert de cron een paar kant-en-klare ideeën
-- (hook + invalshoek + waarom het werkt), op basis van brand voice,
-- strategie en second brain. Draai in de Supabase SQL Editor, ná 014.
-- ════════════════════════════════════════════════════════════════

create table if not exists brief_ideas (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  brief_date  date not null default current_date,
  title       text not null,
  angle       text,
  hook        text,
  why         text,
  status      text not null default 'nieuw',  -- nieuw | bewaard | verborgen
  created_at  timestamptz not null default now()
);

create index if not exists brief_ideas_idx on brief_ideas (agency_id, brief_date desc);
-- Niet twee keer dezelfde dag voor dezelfde klant dezelfde titel.
create unique index if not exists brief_ideas_uniq on brief_ideas (client_id, brief_date, title);

alter table brief_ideas enable row level security;

drop policy if exists "team all brief_ideas" on brief_ideas;
create policy "team all brief_ideas" on brief_ideas
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);
