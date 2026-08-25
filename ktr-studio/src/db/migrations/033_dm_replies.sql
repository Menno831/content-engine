-- ════════════════════════════════════════════════════════════════
-- Migratie 033: DM-replies automatisch verwerken.
-- Binnenkomende replies (via de ManyChat-webhook) landen op de
-- prospect: laatste bericht, tijdstip en een AI-conceptantwoord.
-- ════════════════════════════════════════════════════════════════

alter table prospects add column if not exists last_reply    text;
alter table prospects add column if not exists last_reply_at timestamptz;
alter table prospects add column if not exists reply_draft   text;
