-- ════════════════════════════════════════════════════════════════
-- Migratie 028: eigen kanalen automatisch syncen.
-- De agency krijgt eigen bron-instellingen (IG-handle, YouTube-
-- kanaal); de dagelijkse cron schrijft snapshots naar channel_stats.
-- Website gaat via CLARITY_API_TOKEN (env), LinkedIn blijft handmatig.
-- ════════════════════════════════════════════════════════════════

alter table agencies add column if not exists own_ig_handle  text;
alter table agencies add column if not exists own_yt_channel text;

-- Groeidoel: waar werkt de agency naartoe (per maand, omzet).
alter table agencies add column if not exists goal_monthly numeric not null default 100000;
