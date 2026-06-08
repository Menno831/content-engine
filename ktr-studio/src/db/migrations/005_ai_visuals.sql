-- ════════════════════════════════════════════════════════════════
-- Migratie 005 — AI Visuals (Higgsfield Soul): character per klant +
-- generatie-historie. Draai in de Supabase SQL Editor, ná 004.
-- ════════════════════════════════════════════════════════════════

alter table clients add column if not exists soul_character_id   text;
alter table clients add column if not exists reference_image_url text;
alter table clients add column if not exists brand_prompt        text;

create table if not exists generations (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies (id) on delete cascade,
  client_id   uuid references clients (id) on delete cascade,
  kind        text not null default 'image',  -- 'image' | 'video'
  prompt      text,
  output_url  text,
  status      text not null default 'done',   -- 'queued' | 'done' | 'error'
  created_at  timestamptz not null default now()
);
create index if not exists idx_generations_client on generations (client_id, created_at desc);

alter table generations enable row level security;
create policy "read generations" on generations
  for select using (agency_id = current_agency_id() and current_client_id() is null);
create policy "team insert generations" on generations
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);
