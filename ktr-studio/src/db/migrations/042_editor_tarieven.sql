-- ════════════════════════════════════════════════════════════════
-- Migratie 042: editor-tarieven per format en valuta.
--
-- Eén bedrag per video klopte nooit: een longform kost een editor
-- uren, een clip een kwartier. Vanaf nu twee tarieven, in de valuta
-- waarin de editor betaald wordt. pay_per_video blijft staan als
-- terugval voor bestaande berekeningen.
-- ════════════════════════════════════════════════════════════════

alter table editors add column if not exists pay_longform  numeric;
alter table editors add column if not exists pay_shortform numeric;
alter table editors add column if not exists currency      text not null default 'EUR';
alter table editors add column if not exists welcomed_at   timestamptz;  -- wanneer de welkomstmail is gegaan

-- Bestaande editors: het oude bedrag geldt als shortform-tarief.
update editors set pay_shortform = pay_per_video
where pay_shortform is null and pay_per_video is not null and pay_per_video > 0;
