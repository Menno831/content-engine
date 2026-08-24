-- ════════════════════════════════════════════════════════════════
-- Migratie 027: eigen-kanalen-tracking (website, Instagram,
-- LinkedIn, YouTube). Eén snapshot per kanaal per dag; welke
-- kolommen gevuld zijn verschilt per kanaal:
--   website   → visitors (bezoekers), views (paginaweergaven)
--   instagram → followers, views (reels-views), impressions (bereik)
--   linkedin  → followers, impressions
--   youtube   → followers (abonnees), views
-- Handmatig invullen of straks automatisch (IG-sync / YouTube-key).
-- ════════════════════════════════════════════════════════════════

create table if not exists channel_stats (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies (id) on delete cascade,
  channel     text not null,                 -- website | instagram | linkedin | youtube
  stat_date   date not null default current_date,
  followers   bigint,
  visitors    bigint,
  views       bigint,
  impressions bigint,
  note        text,
  created_at  timestamptz not null default now(),
  unique (agency_id, channel, stat_date)
);
create index if not exists idx_channel_stats on channel_stats (agency_id, channel, stat_date desc);

alter table channel_stats enable row level security;
drop policy if exists "team all channel_stats" on channel_stats;
create policy "team all channel_stats" on channel_stats
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);
