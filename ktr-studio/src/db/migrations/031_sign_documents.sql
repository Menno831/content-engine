-- ════════════════════════════════════════════════════════════════
-- Migratie 031: ondertekenbare documenten (NDA's en overeenkomsten).
-- Een contract kan nu een volledige documenttekst dragen plus een
-- onraadbare ondertekenlink. De tegenpartij opent de link, leest en
-- tekent met naam — vastgelegd met tijdstempel.
-- ════════════════════════════════════════════════════════════════

alter table contracts add column if not exists doc_body    text;
alter table contracts add column if not exists sign_token  text unique;
alter table contracts add column if not exists signed_name text;
alter table contracts add column if not exists signed_at   timestamptz;
