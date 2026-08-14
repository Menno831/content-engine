-- ════════════════════════════════════════════════════════════════
-- Migratie 016 — Editor-werkflow.
-- 1) Files-link per contentkaart (Frame.io/Drive) zodat de editor
--    direct bij het materiaal kan.
-- 2) profiles.editor_id (veiligheid — zit al in nieuwere setups).
-- Draai in de Supabase SQL Editor, ná 015.
-- ════════════════════════════════════════════════════════════════

alter table content  add column if not exists brief_url text;
alter table profiles add column if not exists editor_id uuid references editors (id) on delete set null;
