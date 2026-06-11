-- ════════════════════════════════════════════════════════════════
-- Migratie 013 — Brand-kleuren per klant.
-- Niet elke klant is oranje: deze kleuren sturen straks carousels,
-- stories en thumbnails aan zodat alles in de huisstijl van de
-- klant gegenereerd wordt. Draai in de Supabase SQL Editor, ná 012.
-- ════════════════════════════════════════════════════════════════

alter table clients add column if not exists brand_primary   text;  -- hoofdkleur (hex)
alter table clients add column if not exists brand_secondary text;  -- accentkleur (hex)
