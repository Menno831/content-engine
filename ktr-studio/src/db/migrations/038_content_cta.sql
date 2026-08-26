-- ════════════════════════════════════════════════════════════════
-- Migratie 038: CTA per video. Elke video stuurt kijkers ergens
-- naartoe (ManyChat-keyword, link, leadmagnet) — dat hoort op de
-- kaart, zodat delivery en funnel één geheel zijn.
-- ════════════════════════════════════════════════════════════════
alter table content add column if not exists cta text;
