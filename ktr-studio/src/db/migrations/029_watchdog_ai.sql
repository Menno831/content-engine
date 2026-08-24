-- ════════════════════════════════════════════════════════════════
-- Migratie 029: automatiseringsmotor.
-- 1. growth_notes — wekelijkse AI-analyse bovenop het groeiplan.
-- 2. prospects.message_generated_at — wanneer de AI een concept-DM
--    klaarzette (handmatig geschreven berichten raken we nooit aan).
-- ════════════════════════════════════════════════════════════════

create table if not exists growth_notes (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  note       text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_growth_notes on growth_notes (agency_id, created_at desc);

alter table growth_notes enable row level security;
drop policy if exists "team all growth_notes" on growth_notes;
create policy "team all growth_notes" on growth_notes
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

alter table prospects add column if not exists message_generated_at timestamptz;
