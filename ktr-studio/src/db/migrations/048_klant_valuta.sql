-- ════════════════════════════════════════════════════════════════
-- Migratie 048: valuta per klant. Sommige klanten betalen in dollars;
-- de retainer, editor-kosten en videoprijs staan dan in USD. Voor de
-- totalen (MRR, marge, omzet) rekent Finance om naar euro.
-- ════════════════════════════════════════════════════════════════
alter table clients add column if not exists currency text not null default 'EUR';
