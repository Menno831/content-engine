-- ════════════════════════════════════════════════════════════════
-- Migratie 001 — Pipeline-fases naar Monday-workflow (8 fases)
-- Draai dit één keer in de Supabase SQL Editor op een bestaand project.
-- Zet content.stage om van de oude enum naar een vrij tekstveld, zodat
-- we fases voortaan kunnen aanpassen zonder DB-migratie.
-- Veilig op een lege of gevulde content-tabel.
-- ════════════════════════════════════════════════════════════════

alter table content alter column stage drop default;
alter table content alter column stage type text using stage::text;
alter table content alter column stage set default 'ideation';

-- Oude enum opruimen (wordt nergens meer gebruikt).
drop type if exists content_stage;

-- Eventuele oude waarden meenemen naar de nieuwe workflow (geen-ops als leeg).
update content set stage = 'ideation'         where stage = 'idee';
update content set stage = 'ready_for_editing' where stage = 'script';
update content set stage = 'client_approval'   where stage = 'review';
update content set stage = 'ready_for_posting' where stage = 'goedgekeurd';
update content set stage = 'posted'            where stage = 'live';
