-- ════════════════════════════════════════════════════════════════
-- Migratie 004 — Teamrollen: 'editor' (bv. Jesse) + 'setter' (bv. Nienke)
-- Draai in de Supabase SQL Editor, ná 003.
-- LET OP: 'alter type ... add value' kan niet samen met gebruik in één
-- transactie. Draai dit blok los (de SQL-editor doet dat vanzelf).
-- ════════════════════════════════════════════════════════════════

alter type member_role add value if not exists 'editor';
alter type member_role add value if not exists 'setter';

-- Editor-login koppelen aan een editor-record (voor 'mijn werk' + uitbetaling).
alter table profiles add column if not exists editor_id uuid references editors (id) on delete set null;
