-- ════════════════════════════════════════════════════════════════
-- Migratie 007 — Maanddoel (omzet-target) per agency. Ná 006.
-- ════════════════════════════════════════════════════════════════

alter table agencies add column if not exists monthly_target numeric default 0;
