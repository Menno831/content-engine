-- ════════════════════════════════════════════════════════════════
-- Migratie 043: past een competitor-post bij Menno's strategie?
--
-- Discover liet alles zien wat goed scoorde, ook wat niks met zijn
-- merk te maken heeft. Vanaf nu beoordeelt de AI elke post één keer
-- (fit ja/nee + waarom + hoe Menno 'm zou maken) en toont het scherm
-- standaard alleen wat past. Wat niet past hoeft hij niet te zien.
-- ════════════════════════════════════════════════════════════════

alter table competitor_posts add column if not exists fit            boolean;
alter table competitor_posts add column if not exists fit_reason     text;
alter table competitor_posts add column if not exists fit_angle      text;        -- hoe Menno dit zou maken
alter table competitor_posts add column if not exists fit_checked_at timestamptz;
create index if not exists idx_comp_posts_fit on competitor_posts (agency_id, fit, views desc);

-- Ideeën uit Discover dragen een directe link naar de post.
alter table content_ideas add column if not exists source_url text;
