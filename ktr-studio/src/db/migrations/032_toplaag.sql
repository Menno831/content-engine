-- ════════════════════════════════════════════════════════════════
-- Migratie 032: toplaag-outreach (Seth/Jack-playbook).
-- prospects.tier: 'top' = persoonlijke behandeling (voice notes,
-- case, snelle call), null = brede laag met de standaard-openers.
-- ════════════════════════════════════════════════════════════════
alter table prospects add column if not exists tier text;
create index if not exists idx_prospects_tier on prospects (tier) where tier is not null;
