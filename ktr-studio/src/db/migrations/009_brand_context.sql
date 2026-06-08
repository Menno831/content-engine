-- ════════════════════════════════════════════════════════════════
-- Migratie 009 — Brand-context per klant (onboarding-documenten).
-- Identity, story, strategy en — belangrijk — de brand voice.
-- Draai in de Supabase SQL Editor, ná 008.
-- ════════════════════════════════════════════════════════════════

alter table clients add column if not exists brand_identity text;
alter table clients add column if not exists brand_story    text;
alter table clients add column if not exists brand_strategy text;
alter table clients add column if not exists brand_voice    text;
alter table clients add column if not exists notes          text;

-- Verwijderrechten op klanten (alleen owner/team).
drop policy if exists "team delete clients" on clients;
create policy "team delete clients" on clients
  for delete using (agency_id = current_agency_id() and current_client_id() is null);
