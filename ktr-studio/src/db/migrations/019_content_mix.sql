-- ════════════════════════════════════════════════════════════════
-- Migratie 019: video-mix per klant.
-- Vrij tekstveld naast videos_per_month: wélke soorten video's zitten
-- er in de retainer (bv. "4× Talking, 2× Lifestyle, 2× Clip" of
-- "Alleen YouTube-longforms"). Zichtbaar op het klantprofiel.
-- ════════════════════════════════════════════════════════════════

alter table clients add column if not exists content_mix text;
