-- ════════════════════════════════════════════════════════════════
-- Migratie 020: kaarten verwijderen + Asana-koppeling per klant.
--
-- 1. Er was géén delete-policy op content: "Kaart verwijderen" deed
--    daardoor stilletjes niets (RLS filterde alle rijen weg).
-- 2. asana_project_id op clients: klanten met een eigen Asana-bord
--    (zoals Arthur en Bryan) syncen twee kanten op.
-- ════════════════════════════════════════════════════════════════

drop policy if exists "team delete content" on content;
create policy "team delete content" on content
  for delete using (
    current_client_id() is null
    and client_id in (select id from clients where agency_id = current_agency_id())
  );

alter table clients add column if not exists asana_project_id text;
