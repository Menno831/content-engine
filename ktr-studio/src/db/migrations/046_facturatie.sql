-- ════════════════════════════════════════════════════════════════
-- Migratie 046: wanneer moet de factuur eruit?
-- invoice_day = dag van de maand waarop de retainer gefactureerd hoort
-- te zijn. De ochtend-cron kijkt in Moneybird of er voor die klant al
-- een factuur staat deze maand; zo niet, dan een melding in de bel.
-- ════════════════════════════════════════════════════════════════

alter table clients add column if not exists invoice_day int not null default 1;
