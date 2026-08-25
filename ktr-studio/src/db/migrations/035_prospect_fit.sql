-- ════════════════════════════════════════════════════════════════
-- Migratie 035: prospect-kwalificatie. Alleen prospects met een
-- high-ticket aanbod (≥ €1000) én ruimte voor verbetering op
-- YouTube zijn interessant; de check schrijft zijn oordeel hier.
-- Stage 'afgekeurd' (tekstkolom, geen enum) vangt de afvallers.
-- ════════════════════════════════════════════════════════════════

alter table prospects add column if not exists fit_reason     text;
alter table prospects add column if not exists fit_checked_at timestamptz;
