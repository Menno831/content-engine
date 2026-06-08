-- ════════════════════════════════════════════════════════════════
-- Migratie 008 — Eden: Capture-boards + Discover-swipefile.
-- Eén tabel voor opgeslagen items (links, notities, ideeën, inspiratie).
-- Ná 007.
-- ════════════════════════════════════════════════════════════════

create table if not exists captures (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies (id) on delete cascade,
  board       text not null default 'Swipe file',  -- board-naam (groepering)
  kind        text not null default 'link',        -- 'link' | 'note' | 'idea' | 'swipe'
  title       text not null,
  url         text,
  body        text,
  source      text,                                -- bv. creator/handle bij swipe
  created_at  timestamptz not null default now()
);
create index if not exists idx_captures_agency on captures (agency_id, board, created_at desc);

alter table captures enable row level security;
create policy "read captures" on captures
  for select using (agency_id = current_agency_id() and current_client_id() is null);
create policy "team insert captures" on captures
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);
create policy "team update captures" on captures
  for update using (agency_id = current_agency_id() and current_client_id() is null);
create policy "team delete captures" on captures
  for delete using (agency_id = current_agency_id() and current_client_id() is null);
