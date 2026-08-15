-- ════════════════════════════════════════════════════════════════
-- Migratie 017 — Productie-formats en de assets per kaart.
--
-- 1) format wordt een vrij tekstveld (net als stage in 001), zodat we
--    formats kunnen toevoegen zonder migratie. De vijf vaste formats
--    zijn: Longform, Clip, Lifestyle, VO story, Talking. Trio blijft
--    bestaan voor het lichte werk.
-- 2) Vier assetvelden per kaart, zodat de editor alles in één scherm
--    heeft en we minder revisierondes nodig hebben:
--    frame_url      link naar de oplevering in Frame
--    vo_url         het opgenomen voice over-bestand
--    reference_url  voorbeeldvideo van hoe het eruit moet zien
--    footage_notes  welke trip, welke map, welke oude clips
--
-- Draai in de Supabase SQL Editor, ná 016. Veilig op een gevulde tabel.
-- ════════════════════════════════════════════════════════════════

-- ── 1. format van enum naar tekst ───────────────────────────────
alter table content alter column format drop default;
alter table content alter column format type text using format::text;
alter table content alter column format set default 'Talking';

drop type if exists content_format;

-- Oude waarden meenemen naar de nieuwe indeling.
update content set format = 'Talking'   where format = 'Reel';
update content set format = 'Clip'      where format = 'Short';
update content set format = 'Lifestyle' where format = 'Story';
-- Carrousel blijft zoals hij is.

-- ── 2. assets per kaart ─────────────────────────────────────────
alter table content add column if not exists frame_url     text;
alter table content add column if not exists vo_url        text;
alter table content add column if not exists reference_url text;
alter table content add column if not exists footage_notes text;

-- Wekelijkse planning sneller opvragen: wat gaat er wanneer live.
create index if not exists content_posting_idx on content (client_id, posting_date);
