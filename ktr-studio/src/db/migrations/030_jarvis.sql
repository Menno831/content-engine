-- ════════════════════════════════════════════════════════════════
-- Migratie 030: Jarvis.
-- 1. briefings — de ochtendbriefing per dag (regelgebaseerd, met
--    AI-laag zodra de key werkt). Eén per agency per dag.
-- 2. assistant_messages — gespreksgeschiedenis met Jarvis.
-- ════════════════════════════════════════════════════════════════

create table if not exists briefings (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  brief_date date not null default current_date,
  content    text not null,
  ai         boolean not null default false,   -- true = AI-verrijkt
  created_at timestamptz not null default now(),
  unique (agency_id, brief_date)
);
create index if not exists idx_briefings on briefings (agency_id, brief_date desc);

alter table briefings enable row level security;
drop policy if exists "team all briefings" on briefings;
create policy "team all briefings" on briefings
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

create table if not exists assistant_messages (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  user_id    uuid,
  role       text not null,                    -- user | assistant
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_assistant_msgs on assistant_messages (agency_id, created_at desc);

alter table assistant_messages enable row level security;
drop policy if exists "team all assistant_messages" on assistant_messages;
create policy "team all assistant_messages" on assistant_messages
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);
