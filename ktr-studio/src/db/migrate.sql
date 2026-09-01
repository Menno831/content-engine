-- ════════════════════════════════════════════════════════════════
-- KTR Studio — VEILIGE update-migratie (010 t/m 015 gecombineerd).
--
-- ✅ Puur ADDITIEF: alleen toevoegen, niets droppen of leegmaken.
-- ✅ Idempotent: zo vaak draaien als je wil, zonder fouten of dataverlies.
-- ✅ Draai dit op je BESTAANDE database (met je echte klanten erin).
--
-- Gebruik dit i.p.v. setup.sql zodra je al data hebt. Plak in de
-- Supabase SQL Editor en klik Run.
-- ════════════════════════════════════════════════════════════════

-- ── 010 · Intake (brand voice) + opdrachten per klant ───────────
alter table clients add column if not exists intake_token   text unique;
alter table clients add column if not exists intake_answers jsonb;

create table if not exists orders (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  title       text not null,
  deliverables text,
  price       numeric not null default 0,
  editor_cost numeric not null default 0,
  other_cost  numeric not null default 0,
  status      text not null default 'open',
  deadline    date,
  created_at  timestamptz not null default now()
);
create index if not exists orders_agency_idx on orders (agency_id);
create index if not exists orders_client_idx on orders (client_id);
alter table orders enable row level security;
drop policy if exists "team all orders" on orders;
create policy "team all orders" on orders
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "client read own orders" on orders;
create policy "client read own orders" on orders
  for select using (agency_id = current_agency_id() and client_id = current_client_id());

-- ── 011 · Transcripten per klant (brand voice-bron) ─────────────
create table if not exists transcripts (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  title       text not null default 'Transcript',
  content     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists transcripts_client_idx on transcripts (client_id);
alter table transcripts enable row level security;
drop policy if exists "team all transcripts" on transcripts;
create policy "team all transcripts" on transcripts
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

-- ── 012 · Opdrachten: factuurmaand + referentie ─────────────────
alter table orders add column if not exists invoice_month date;
alter table orders add column if not exists invoice_ref   text;
update orders set invoice_month = date_trunc('month', created_at)::date where invoice_month is null;

-- ── 013 · Brand-kleuren per klant ───────────────────────────────
alter table clients add column if not exists brand_primary   text;
alter table clients add column if not exists brand_secondary text;

-- ── 014 · Competitors, editor-pool, lead-follow-ups ─────────────
create table if not exists competitors (
  id             uuid primary key default gen_random_uuid(),
  agency_id      uuid not null references agencies(id) on delete cascade,
  handle         text not null,
  name           text,
  niche          text,
  followers      bigint,
  last_synced_at timestamptz,
  created_at     timestamptz not null default now(),
  unique (agency_id, handle)
);
create table if not exists competitor_posts (
  id            uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references competitors(id) on delete cascade,
  agency_id     uuid not null references agencies(id) on delete cascade,
  external_id   text not null,
  caption       text,
  format        text,
  permalink     text,
  views         bigint,
  likes         bigint,
  comments      bigint,
  posted_at     timestamptz,
  fetched_at    timestamptz not null default now(),
  unique (competitor_id, external_id)
);
create index if not exists idx_comp_posts on competitor_posts (agency_id, views desc);
alter table competitors enable row level security;
alter table competitor_posts enable row level security;
drop policy if exists "team all competitors" on competitors;
create policy "team all competitors" on competitors
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team all competitor_posts" on competitor_posts;
create policy "team all competitor_posts" on competitor_posts
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

alter table editors add column if not exists specialty     text;
alter table editors add column if not exists pool_status   text not null default 'actief';
alter table editors add column if not exists contact       text;
alter table editors add column if not exists portfolio_url text;
alter table editors add column if not exists notes         text;

alter table leads add column if not exists next_followup date;
alter table leads add column if not exists followup_note text;

-- ── 015 · Daily Brief: dagelijkse content-ideeën per klant ──────
create table if not exists brief_ideas (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  brief_date  date not null default current_date,
  title       text not null,
  angle       text,
  hook        text,
  why         text,
  status      text not null default 'nieuw',
  created_at  timestamptz not null default now()
);
create index if not exists brief_ideas_idx on brief_ideas (agency_id, brief_date desc);
create unique index if not exists brief_ideas_uniq on brief_ideas (client_id, brief_date, title);
alter table brief_ideas enable row level security;
drop policy if exists "team all brief_ideas" on brief_ideas;
create policy "team all brief_ideas" on brief_ideas
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

-- Klaar. Alle nieuwe functies (opdrachten, transcripten, intake, brand-kleuren,
-- competitors, editor-pool, follow-ups, daily brief) zijn nu beschikbaar.

-- ── 016 · Editor-werkflow: files-link per kaart ─────────────────
alter table content  add column if not exists brief_url text;
alter table profiles add column if not exists editor_id uuid references editors (id) on delete set null;

-- ── 017 · Productie-formats + assets per kaart ──────────────────
-- ── 1. format van enum naar tekst ───────────────────────────────
alter table content alter column format drop default;
alter table content alter column format type text using format::text;
alter table content alter column format set default 'Talking';

drop type if exists content_format;

-- Oude waarden meenemen naar de nieuwe indeling.
update content set format = 'Talking'   where format = 'Reel';
update content set format = 'Clip'      where format = 'Short';
update content set format = 'Lifestyle' where format = 'Story';
-- Carrousel blijft zoals hij is.

-- ── 2. assets per kaart ─────────────────────────────────────────
alter table content add column if not exists frame_url     text;
alter table content add column if not exists vo_url        text;
alter table content add column if not exists reference_url text;
alter table content add column if not exists footage_notes text;

-- Wekelijkse planning sneller opvragen: wat gaat er wanneer live.
create index if not exists content_posting_idx on content (client_id, posting_date);

-- ── 018 · Account-snapshots: volgers per kanaal per sync ────────
create table if not exists account_metrics (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients (id) on delete cascade,
  source     text not null,
  followers  bigint,
  total_posts bigint,
  fetched_at timestamptz not null default now()
);
create index if not exists idx_account_metrics on account_metrics (client_id, fetched_at desc);
alter table account_metrics enable row level security;
drop policy if exists "read account_metrics" on account_metrics;
create policy "read account_metrics" on account_metrics
  for select using (
    client_id in (select id from clients where agency_id = current_agency_id())
    and (current_client_id() is null or client_id = current_client_id())
  );

-- ── 019 · Video-mix per klant ───────────────────────────────────
-- Vrij tekstveld naast videos_per_month: wélke soorten video's in de
-- retainer zitten (bv. "4× Talking, 2× Lifestyle" of "Alleen YouTube").
alter table clients add column if not exists content_mix text;

-- ── 020 · Kaarten verwijderen + Asana-koppeling per klant ───────
-- Delete-policy ontbrak: "Kaart verwijderen" deed stilletjes niets.
drop policy if exists "team delete content" on content;
create policy "team delete content" on content
  for delete using (
    current_client_id() is null
    and client_id in (select id from clients where agency_id = current_agency_id())
  );
-- Klanten met een eigen Asana-bord (bv. Arthur en Bryan) twee-weg syncen.
alter table clients add column if not exists asana_project_id text;

-- ── 021 · Outreach-upgrade + Moneybird-factuurmeldingen ─────────
alter table prospects add column if not exists message text;
alter table prospects add column if not exists external_id text;
create unique index if not exists idx_prospects_external
  on prospects (external_id) where external_id is not null;
create table if not exists seen_invoices (
  id      text primary key,
  seen_at timestamptz not null default now()
);
alter table seen_invoices enable row level security;

-- ── 022 · Scripts-bibliotheek (van mennokater.nl naar hier) ─────

create table if not exists scripts (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  client_id  uuid references clients (id) on delete set null,
  title      text not null,
  content    text,
  status     text not null default 'to_write',  -- to_write | to_record | recorded
  tag        text,                              -- bv. 'Mexico' (trip/serie)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_scripts_agency on scripts (agency_id, status, updated_at desc);

alter table scripts enable row level security;
drop policy if exists "read scripts" on scripts;
create policy "read scripts" on scripts
  for select using (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team insert scripts" on scripts;
create policy "team insert scripts" on scripts
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team update scripts" on scripts;
create policy "team update scripts" on scripts
  for update using (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "team delete scripts" on scripts;
create policy "team delete scripts" on scripts
  for delete using (agency_id = current_agency_id() and current_client_id() is null);
-- ════════════════════════════════════════════════════════════════
-- Migratie 023: scripts-review + opnamelocatie, outreach-dagteller,
-- kosten per factuur en vaste lasten.
--
-- 1. scripts.location    — waar dit script opgenomen moet worden
--    (bv. 'Mexico', 'België', 'Thuis'), zodat een trip in één filter
--    alle opneembare scripts toont.
-- 2. scripts.review_note — status 'to_review' ("nog aanpassen") komt
--    erbij in de app; deze notitie zegt wát er nog moet gebeuren.
-- 3. prospects.dm_sent_at — gezet zodra een prospect naar
--    'dm_verstuurd' schuift; voedt de "vandaag verstuurd"-teller.
-- 4. invoice_costs — geschatte kosten per Moneybird-factuur (id =
--    Moneybird-factuur-id), zodat Finance winst per factuur toont.
-- 5. fixed_costs — vaste maandlasten van de agency (Claude, bank,
--    Skool, telefoon...), meegenomen in het maandoverzicht.
-- ════════════════════════════════════════════════════════════════

alter table scripts add column if not exists location    text;
alter table scripts add column if not exists review_note text;

alter table prospects add column if not exists dm_sent_at timestamptz;

create table if not exists invoice_costs (
  id         text primary key,               -- Moneybird-factuur-id
  agency_id  uuid not null references agencies (id) on delete cascade,
  cost       numeric not null default 0,
  note       text,
  updated_at timestamptz not null default now()
);
alter table invoice_costs enable row level security;
drop policy if exists "team all invoice_costs" on invoice_costs;
create policy "team all invoice_costs" on invoice_costs
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

create table if not exists fixed_costs (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  name       text not null,
  amount     numeric not null default 0,     -- per maand
  note       text,
  created_at timestamptz not null default now()
);
alter table fixed_costs enable row level security;
drop policy if exists "team all fixed_costs" on fixed_costs;
create policy "team all fixed_costs" on fixed_costs
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

-- 6. editors: delete-policy ontbrak — "Verwijderen" deed anders stilletjes niks.
drop policy if exists "team delete editors" on editors;
create policy "team delete editors" on editors
  for delete using (agency_id = current_agency_id() and current_client_id() is null);

-- 7. todos: persoonlijke taken naast klant-taken — client_id mag leeg,
--    urgency ('vandaag' | 'later') en user_id (van wie de taak is).
alter table todos alter column client_id drop not null;
alter table todos add column if not exists urgency text;
alter table todos add column if not exists user_id uuid;
-- ════════════════════════════════════════════════════════════════
-- Migratie 024: factuur-kostenbreakdown, overige inkomsten per
-- maand, en editors gekoppeld aan specifieke klanten.
--
-- 1. invoice_costs.breakdown — kostenregels per factuur als jsonb
--    [{label, amount}] (edits, thumbnails, postkosten...); cost
--    blijft de som zodat bestaande weergaven blijven werken.
-- 2. other_income — inkomsten die nooit gefactureerd zijn (bv.
--    crypto in jan/feb), per maand, zodat het maandoverzicht klopt.
-- 3. editors.client_ids — op welke klant(en) een editor zit; een
--    editor-login ziet alleen het board van die klanten.
-- ════════════════════════════════════════════════════════════════

alter table invoice_costs add column if not exists breakdown jsonb;

create table if not exists other_income (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  month      date not null,               -- eerste van de maand
  label      text not null,
  amount     numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_other_income on other_income (agency_id, month);
alter table other_income enable row level security;
drop policy if exists "team all other_income" on other_income;
create policy "team all other_income" on other_income
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

alter table editors add column if not exists client_ids uuid[];
-- ════════════════════════════════════════════════════════════════
-- Migratie 025: het klant-werkstation compleet maken.
--
-- 1. eod_reports   — dag afsluiten per teamlid (wat af is, blockers,
--                    morgen). Voedt de EOD-teller op het dashboard.
-- 2. meetings      — agenda/calls, optioneel gekoppeld aan een klant.
-- 3. client_links  — vaste links per klant (Drive, Frame, merkmap...).
-- 4. story_sequences + story_slides — handmatige Instagram-stories:
--    per dag een reeks slides met views, drop-off, link-clicks.
-- 5. clients       — manager (CSM), verbergen, health, startdatum,
--                    TikTok-handle.
-- 6. leads         — score, contactgegevens, closer, dealvorm.
-- ════════════════════════════════════════════════════════════════

create table if not exists eod_reports (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  user_id    uuid not null,
  full_name  text,
  eod_date   date not null default current_date,
  done       text,
  blockers   text,
  tomorrow   text,
  videos     integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, eod_date)
);
create index if not exists idx_eod_agency on eod_reports (agency_id, eod_date desc);
alter table eod_reports enable row level security;
drop policy if exists "team all eod" on eod_reports;
create policy "team all eod" on eod_reports
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

create table if not exists meetings (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  client_id  uuid references clients (id) on delete set null,
  title      text not null,
  starts_at  timestamptz not null,
  duration   integer not null default 30,   -- minuten
  attendees  text,
  notes      text,
  outcome    text,                          -- gepland | gehouden | no_show | verzet
  created_at timestamptz not null default now()
);
create index if not exists idx_meetings_agency on meetings (agency_id, starts_at);
alter table meetings enable row level security;
drop policy if exists "team all meetings" on meetings;
create policy "team all meetings" on meetings
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);
drop policy if exists "client read own meetings" on meetings;
create policy "client read own meetings" on meetings
  for select using (agency_id = current_agency_id() and client_id = current_client_id());

create table if not exists client_links (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  client_id  uuid not null references clients (id) on delete cascade,
  label      text not null,
  url        text not null,
  category   text,                          -- footage | merk | tools | anders
  created_at timestamptz not null default now()
);
create index if not exists idx_client_links on client_links (client_id);
alter table client_links enable row level security;
drop policy if exists "team all client_links" on client_links;
create policy "team all client_links" on client_links
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

create table if not exists story_sequences (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  client_id  uuid not null references clients (id) on delete cascade,
  seq_date   date not null default current_date,
  created_at timestamptz not null default now(),
  unique (client_id, seq_date)
);
create index if not exists idx_story_seq on story_sequences (client_id, seq_date desc);
alter table story_sequences enable row level security;
drop policy if exists "team all story_sequences" on story_sequences;
create policy "team all story_sequences" on story_sequences
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

create table if not exists story_slides (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies (id) on delete cascade,
  sequence_id uuid not null references story_sequences (id) on delete cascade,
  position    integer not null default 1,
  slide_type  text,                         -- Aesthetic | Waarde | Verhaal | CTA
  cta         text,
  views       integer not null default 0,
  link_clicks integer not null default 0,
  replies     integer not null default 0,
  likes       integer not null default 0,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_story_slides on story_slides (sequence_id, position);
alter table story_slides enable row level security;
drop policy if exists "team all story_slides" on story_slides;
create policy "team all story_slides" on story_slides
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

-- Klanten: wie beheert 'm, verbergen uit de lijst, gezondheid, start.
alter table clients add column if not exists manager      text;
alter table clients add column if not exists hidden       boolean not null default false;
alter table clients add column if not exists health       text;      -- goed | let_op | risico
alter table clients add column if not exists health_note  text;
alter table clients add column if not exists start_date   date;
alter table clients add column if not exists tiktok_handle text;

-- Leads: kwalificatie en toewijzing.
alter table leads add column if not exists score      integer not null default 1;
alter table leads add column if not exists instagram  text;
alter table leads add column if not exists email      text;
alter table leads add column if not exists phone      text;
alter table leads add column if not exists closer     text;
alter table leads add column if not exists deal_terms text;          -- recurring | one_time
alter table leads add column if not exists source     text;          -- organic | dm | paid | referral ...
alter table leads add column if not exists notes      text;
-- ════════════════════════════════════════════════════════════════
-- Migratie 026: de laatste losse eindjes van het agency-OS.
--
-- 1. lead_forms  — publieke leadformulieren. Elk formulier heeft een
--    onraadbare token; inzendingen landen als lead bij de gekoppelde
--    klant (of bij de agency zelf als er geen klant aan hangt).
-- 2. contracts   — welke afspraken lopen, wat ze waard zijn en wanneer
--    ze aflopen.
-- 3. ad_spend    — advertentie-uitgaven per maand, om rendement te
--    kunnen afzetten tegen leads en omzet.
-- ════════════════════════════════════════════════════════════════

create table if not exists lead_forms (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references agencies (id) on delete cascade,
  client_id    uuid references clients (id) on delete set null,
  name         text not null,
  token        text not null unique,
  headline     text,
  intro        text,
  button_label text not null default 'Versturen',
  ask_phone    boolean not null default false,
  ask_instagram boolean not null default true,
  active       boolean not null default true,
  submissions  integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists idx_lead_forms on lead_forms (agency_id, created_at desc);
alter table lead_forms enable row level security;
drop policy if exists "team all lead_forms" on lead_forms;
create policy "team all lead_forms" on lead_forms
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

create table if not exists contracts (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  client_id  uuid references clients (id) on delete set null,
  title      text not null,
  party      text,                                -- tegenpartij / contactpersoon
  value      numeric not null default 0,          -- per maand of eenmalig
  recurring  boolean not null default true,
  status     text not null default 'concept',     -- concept | verstuurd | getekend | verlopen
  starts_on  date,
  ends_on    date,
  doc_url    text,
  notes      text,
  created_at timestamptz not null default now()
);
create index if not exists idx_contracts on contracts (agency_id, status);
alter table contracts enable row level security;
drop policy if exists "team all contracts" on contracts;
create policy "team all contracts" on contracts
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

create table if not exists ad_spend (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  client_id  uuid references clients (id) on delete set null,
  month      date not null,                       -- eerste van de maand
  platform   text not null default 'Instagram',   -- Instagram | YouTube | TikTok | Google
  amount     numeric not null default 0,
  notes      text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ad_spend on ad_spend (agency_id, month desc);
alter table ad_spend enable row level security;
drop policy if exists "team all ad_spend" on ad_spend;
create policy "team all ad_spend" on ad_spend
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);
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
-- ════════════════════════════════════════════════════════════════
-- Migratie 028: eigen kanalen automatisch syncen.
-- De agency krijgt eigen bron-instellingen (IG-handle, YouTube-
-- kanaal); de dagelijkse cron schrijft snapshots naar channel_stats.
-- Website gaat via CLARITY_API_TOKEN (env), LinkedIn blijft handmatig.
-- ════════════════════════════════════════════════════════════════

alter table agencies add column if not exists own_ig_handle  text;
alter table agencies add column if not exists own_yt_channel text;

-- 028-aanvulling: groeidoel per maand
alter table agencies add column if not exists goal_monthly numeric not null default 100000;
-- ════════════════════════════════════════════════════════════════
-- Migratie 029: automatiseringsmotor.
-- 1. growth_notes — wekelijkse AI-analyse bovenop het groeiplan.
-- 2. prospects.message_generated_at — wanneer de AI een concept-DM
--    klaarzette (handmatig geschreven berichten raken we nooit aan).
-- ════════════════════════════════════════════════════════════════

create table if not exists growth_notes (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  note       text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_growth_notes on growth_notes (agency_id, created_at desc);

alter table growth_notes enable row level security;
drop policy if exists "team all growth_notes" on growth_notes;
create policy "team all growth_notes" on growth_notes
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

alter table prospects add column if not exists message_generated_at timestamptz;
-- ════════════════════════════════════════════════════════════════
-- Migratie 030: Jarvis.
-- 1. briefings — de ochtendbriefing per dag (regelgebaseerd, met
--    AI-laag zodra de key werkt). Eén per agency per dag.
-- 2. assistant_messages — gespreksgeschiedenis met Jarvis.
-- ════════════════════════════════════════════════════════════════

create table if not exists briefings (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  brief_date date not null default current_date,
  content    text not null,
  ai         boolean not null default false,   -- true = AI-verrijkt
  created_at timestamptz not null default now(),
  unique (agency_id, brief_date)
);
create index if not exists idx_briefings on briefings (agency_id, brief_date desc);

alter table briefings enable row level security;
drop policy if exists "team all briefings" on briefings;
create policy "team all briefings" on briefings
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

create table if not exists assistant_messages (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies (id) on delete cascade,
  user_id    uuid,
  role       text not null,                    -- user | assistant
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_assistant_msgs on assistant_messages (agency_id, created_at desc);

alter table assistant_messages enable row level security;
drop policy if exists "team all assistant_messages" on assistant_messages;
create policy "team all assistant_messages" on assistant_messages
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);
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
-- ════════════════════════════════════════════════════════════════
-- Migratie 031: fixes uit de code-review van 24 aug.
--
-- 1. agencies had alleen een SELECT-policy, waardoor "Bronnen
--    opslaan" op Eigen kanalen stil niets deed (0 rijen geraakt,
--    geen fout). Team mag nu de eigen agency-rij bijwerken.
-- 2. channel_stats krijgt een bron-kolom (handmatig | instagram |
--    youtube | clarity) zodat sync en handwerk elkaar niet meer
--    spoorloos overschrijven — regel: metrics dragen altijd bron.
-- 3. Formulier-teller wordt een echte atomaire increment (RPC)
--    in plaats van een count op het display-label.
-- 4. clients.moneybird_contact: expliciete koppeling naar de
--    contactnaam in Moneybird voor klanten met korte namen (A&B)
--    waar de naam-heuristiek niet op durft te matchen.
-- ════════════════════════════════════════════════════════════════

drop policy if exists "team update agency" on agencies;
create policy "team update agency" on agencies
  for update using (id = current_agency_id() and current_client_id() is null)
  with check (id = current_agency_id() and current_client_id() is null);

alter table channel_stats add column if not exists source text not null default 'handmatig';

create or replace function increment_form_submissions(p_form_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update lead_forms set submissions = submissions + 1 where id = p_form_id;
$$;

alter table clients add column if not exists moneybird_contact text;
-- ════════════════════════════════════════════════════════════════
-- Migratie 032: toplaag-outreach (Seth/Jack-playbook).
-- prospects.tier: 'top' = persoonlijke behandeling (voice notes,
-- case, snelle call), null = brede laag met de standaard-openers.
-- ════════════════════════════════════════════════════════════════
alter table prospects add column if not exists tier text;
create index if not exists idx_prospects_tier on prospects (tier) where tier is not null;
-- ════════════════════════════════════════════════════════════════
-- Migratie 033: DM-replies automatisch verwerken.
-- Binnenkomende replies (via de ManyChat-webhook) landen op de
-- prospect: laatste bericht, tijdstip en een AI-conceptantwoord.
-- ════════════════════════════════════════════════════════════════

alter table prospects add column if not exists last_reply    text;
alter table prospects add column if not exists last_reply_at timestamptz;
alter table prospects add column if not exists reply_draft   text;
-- ════════════════════════════════════════════════════════════════
-- Migratie 034: Frame.io-koppeling.
-- We onthouden welke uploads al gezien zijn (anders elke run
-- dezelfde melding) en welk Frame.io-project bij de agency hoort.
-- ════════════════════════════════════════════════════════════════

create table if not exists frameio_seen (
  id      text primary key,          -- Frame.io file-id
  name    text,
  seen_at timestamptz not null default now()
);
alter table frameio_seen enable row level security;

alter table agencies add column if not exists frameio_project_id text;
-- ════════════════════════════════════════════════════════════════
-- Migratie 035: prospect-kwalificatie. Alleen prospects met een
-- high-ticket aanbod (≥ €1000) én ruimte voor verbetering op
-- YouTube zijn interessant; de check schrijft zijn oordeel hier.
-- Stage 'afgekeurd' (tekstkolom, geen enum) vangt de afvallers.
-- ════════════════════════════════════════════════════════════════

alter table prospects add column if not exists fit_reason     text;
alter table prospects add column if not exists fit_checked_at timestamptz;
-- ════════════════════════════════════════════════════════════════
-- Migratie 036: Finance-uitbouw.
-- 1. month_goals: klikbare omzetdoelen per komende maand.
-- 2. expense_links: bankmutaties (uit Moneybird) toegewezen aan een
--    klant / vaste last / privé — de wekelijkse uitgaven-triage.
-- 3. agencies.reserve_config: door Menno zelf ingestelde percentages
--    voor de potjes (belasting/buffer/overig).
-- ════════════════════════════════════════════════════════════════

create table if not exists month_goals (
  agency_id uuid not null references agencies(id) on delete cascade,
  month     text not null, -- 'YYYY-MM'
  goal      numeric not null default 0,
  note      text,
  primary key (agency_id, month)
);
alter table month_goals enable row level security;
drop policy if exists month_goals_rw on month_goals;
create policy month_goals_rw on month_goals
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

create table if not exists expense_links (
  id        text primary key,          -- Moneybird financial_mutation id
  agency_id uuid not null references agencies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  kind      text not null default 'overig', -- klant | vast | prive | overig
  label     text,
  amount    numeric not null default 0,
  mutation_date date,
  created_at timestamptz not null default now()
);
alter table expense_links enable row level security;
drop policy if exists expense_links_rw on expense_links;
create policy expense_links_rw on expense_links
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

alter table agencies add column if not exists reserve_config jsonb;
-- ════════════════════════════════════════════════════════════════
-- Migratie 037: de ochtendscan (Discover). Elke ochtend pikt de
-- bewaker interessante YouTube-video's uit Menno's volglijst +
-- interesse-onderwerpen: outliers, knowledge, concepten om te
-- pakken. Menno's mening per video landt in note (voer voor
-- scripts en eigen content).
-- ════════════════════════════════════════════════════════════════

create table if not exists feed_items (
  id         text primary key,   -- YouTube video-id
  agency_id  uuid not null references agencies(id) on delete cascade,
  title      text not null,
  channel    text,
  url        text not null,
  views      bigint not null default 0,
  outlier    numeric,            -- views t.o.v. kanaal-mediaan
  category   text not null default 'concept', -- outlier | knowledge | concept
  summary    text,
  note       text,               -- Menno's mening / wat hij ermee wil
  created_at timestamptz not null default now()
);
alter table feed_items enable row level security;
drop policy if exists feed_items_rw on feed_items;
create policy feed_items_rw on feed_items
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

alter table agencies add column if not exists feed_channels text; -- komma-lijst @handles
alter table agencies add column if not exists feed_topics   text; -- komma-lijst zoektermen
-- ════════════════════════════════════════════════════════════════
-- Migratie 038: CTA per video. Elke video stuurt kijkers ergens
-- naartoe (ManyChat-keyword, link, leadmagnet) — dat hoort op de
-- kaart, zodat delivery en funnel één geheel zijn.
-- ════════════════════════════════════════════════════════════════
alter table content add column if not exists cta text;

-- ── 039 · Advertenties op campagne-niveau ──────────────────────
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
