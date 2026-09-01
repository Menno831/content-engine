-- ════════════════════════════════════════════════════════════════
-- Migratie 039: advertenties op campagne-niveau.
--
-- ad_spend hield alleen een maandbedrag bij. Om te kunnen zien wát er
-- werkt (campagne, doelgroep, creative, welke video) gaan we naar
-- regels per dag per advertentie, met de ruwe cijfers erbij. Afgeleide
-- getallen (CTR, CPM, CPL, ROAS) rekenen we in de app uit — nooit
-- opslaan wat je kunt afleiden.
--
-- ad_insights bewaart de AI-analyses zodat een pagina-refresh geen
-- nieuwe API-call kost.
-- ════════════════════════════════════════════════════════════════

create table if not exists ad_entries (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies (id) on delete cascade,
  client_id   uuid references clients (id) on delete set null,
  date        date not null,
  platform    text not null default 'Meta',      -- Meta | YouTube | TikTok | Google
  campaign    text,
  adset       text,                              -- doelgroep
  creative    text,                              -- advertentienaam
  content_id  uuid references content (id) on delete set null,  -- welke video draait er
  impressions bigint  not null default 0,
  clicks      bigint  not null default 0,
  spend       numeric not null default 0,
  results     bigint  not null default 0,        -- leads/conversies volgens het platform
  revenue     numeric not null default 0,
  source      text not null default 'handmatig', -- handmatig | csv | api
  external_id text,                              -- id uit het advertentieplatform
  created_at  timestamptz not null default now()
);
create index if not exists idx_ad_entries on ad_entries (agency_id, date desc);
create index if not exists idx_ad_entries_client on ad_entries (client_id, date desc);
-- Importeren mag je zo vaak je wilt: dezelfde regel komt er niet dubbel in.
create unique index if not exists idx_ad_entries_ext
  on ad_entries (agency_id, external_id) where external_id is not null;

alter table ad_entries enable row level security;
drop policy if exists "team all ad_entries" on ad_entries;
create policy "team all ad_entries" on ad_entries
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

create table if not exists ad_insights (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references agencies (id) on delete cascade,
  client_id    uuid references clients (id) on delete set null,
  period_start date not null,
  period_end   date not null,
  body         text not null,
  model        text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_ad_insights on ad_insights (agency_id, created_at desc);

alter table ad_insights enable row level security;
drop policy if exists "team all ad_insights" on ad_insights;
create policy "team all ad_insights" on ad_insights
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

-- Bestaande maandbedragen meenemen als één regel op de 1e van de maand,
-- zodat de historie niet verdwijnt.
insert into ad_entries (agency_id, client_id, date, platform, campaign, spend, source)
select s.agency_id, s.client_id, s.month, coalesce(s.platform, 'Meta'),
       coalesce(s.notes, 'Maandtotaal (oude invoer)'), s.amount, 'handmatig'
from ad_spend s
where not exists (
  select 1 from ad_entries e
  where e.agency_id = s.agency_id and e.date = s.month
    and e.campaign = coalesce(s.notes, 'Maandtotaal (oude invoer)')
);
