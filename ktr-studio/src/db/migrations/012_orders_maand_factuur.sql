-- ════════════════════════════════════════════════════════════════
-- Migratie 012 — Opdrachten per maand + factuurreferentie.
-- Elke opdracht hoort bij een factuurmaand; zo zie je per maand wat
-- er gedaan moet worden, wat het oplevert en op welke factuur het staat.
-- Draai in de Supabase SQL Editor, ná 011.
-- ════════════════════════════════════════════════════════════════

alter table orders add column if not exists invoice_month date;  -- eerste dag v.d. maand
alter table orders add column if not exists invoice_ref   text;  -- factuurnummer/-referentie

-- Bestaande opdrachten standaard in de maand van aanmaak zetten.
update orders set invoice_month = date_trunc('month', created_at)::date where invoice_month is null;
