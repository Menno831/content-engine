-- ════════════════════════════════════════════════════════════════
-- Migratie 021: outreach-upgrade + Moneybird-factuurmeldingen.
--
-- 1. prospects.message: kant-en-klaar DM-bericht per prospect
--    (kopieer & verstuur vanaf de outreach-pagina).
-- 2. prospects.external_id: herkomst (bv. 'monday:<id>') zodat een
--    import idempotent kan draaien.
-- 3. seen_invoices: welke Moneybird-facturen we al gezien hebben —
--    de cron meldt alleen nieuwe facturen (alleen server, geen RLS-lees).
-- ════════════════════════════════════════════════════════════════

alter table prospects add column if not exists message text;
alter table prospects add column if not exists external_id text;
create unique index if not exists idx_prospects_external
  on prospects (external_id) where external_id is not null;

create table if not exists seen_invoices (
  id      text primary key,
  seen_at timestamptz not null default now()
);
alter table seen_invoices enable row level security;
-- Geen policies: alleen de server (service role) leest/schrijft dit.
