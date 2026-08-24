-- ════════════════════════════════════════════════════════════════
-- Migratie 031: fixes uit de code-review van 24 aug.
--
-- 1. agencies had alleen een SELECT-policy, waardoor "Bronnen
--    opslaan" op Eigen kanalen stil niets deed (0 rijen geraakt,
--    geen fout). Team mag nu de eigen agency-rij bijwerken.
-- 2. channel_stats krijgt een bron-kolom (handmatig | instagram |
--    youtube | clarity) zodat sync en handwerk elkaar niet meer
--    spoorloos overschrijven — regel: metrics dragen altijd bron.
-- 3. Formulier-teller wordt een echte atomaire increment (RPC)
--    in plaats van een count op het display-label.
-- 4. clients.moneybird_contact: expliciete koppeling naar de
--    contactnaam in Moneybird voor klanten met korte namen (A&B)
--    waar de naam-heuristiek niet op durft te matchen.
-- ════════════════════════════════════════════════════════════════

drop policy if exists "team update agency" on agencies;
create policy "team update agency" on agencies
  for update using (id = current_agency_id() and current_client_id() is null)
  with check (id = current_agency_id() and current_client_id() is null);

alter table channel_stats add column if not exists source text not null default 'handmatig';

create or replace function increment_form_submissions(p_form_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update lead_forms set submissions = submissions + 1 where id = p_form_id;
$$;

alter table clients add column if not exists moneybird_contact text;
