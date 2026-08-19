-- ════════════════════════════════════════════════════════════════
-- KTR Studio — VOLLEDIGE SETUP in één keer.
-- Draai dit in de Supabase SQL Editor. Het zet de complete database neer
-- (alle tabellen, kolommen, beveiliging) zodat alle functies werken.
--
-- ⚠️ Begint met een schone lei: bestaande KTR Studio-tabellen worden
-- gedropt. Alleen draaien op een dev/lege database (je hebt nog geen
-- echte klantdata). Daarna: zet NEXT_PUBLIC_DEMO_MODE=false in Vercel.
-- ════════════════════════════════════════════════════════════════

drop table if exists
  scripts, seen_invoices, account_metrics, brief_ideas, competitor_posts, competitors, transcripts, orders, captures, generations, prospects, content_metrics, leads, content,
  integrations, editors, todos, notifications, clients, profiles, agencies
  cascade;
drop type if exists
  member_role, client_status, integration_provider, integration_status,
  content_format, lead_stage
  cascade;

-- ════════════════════════════════════════════════════════════════
-- KTR Studio — databaseschema (Supabase / Postgres)
-- Multi-tenant: agency → klanten → content → metrics → leads.
-- Kernprincipe: ELKE metric draagt een bron + ophaaltijdstempel.
-- Draai dit in de Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════

-- ── Agencies (de tenant) ────────────────────────────────────────
create table if not exists agencies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users (id) on delete cascade,
  -- White-label
  brand_name  text,
  accent      text default '#F97316',
  monthly_target numeric default 0,  -- maand-omzetdoel
  created_at  timestamptz not null default now()
);

-- ── Profielen (koppelt auth-users aan een agency + rol) ─────────
create type member_role as enum ('owner', 'team', 'client', 'editor', 'setter');

create table if not exists profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  agency_id  uuid not null references agencies (id) on delete cascade,
  role       member_role not null default 'team',
  full_name  text,
  -- Voor client-rol: aan welke klant is deze login gekoppeld
  client_id  uuid,
  created_at timestamptz not null default now()
);

-- ── Klanten ─────────────────────────────────────────────────────
create type client_status as enum ('actief', 'onboarding', 'gepauzeerd');

create table if not exists clients (
  id               uuid primary key default gen_random_uuid(),
  agency_id        uuid not null references agencies (id) on delete cascade,
  name             text not null,
  ig_handle        text,
  yt_channel_id    text,
  contact_email    text,
  status           client_status not null default 'onboarding',
  package          text,
  monthly_value    numeric default 0,   -- retainer
  videos_per_month int default 0,
  content_mix      text,               -- soorten video's in de retainer
  asana_project_id text,               -- eigen Asana-bord (twee-weg-sync)
  editor_cost      numeric default 0,
  payment_status   text default 'open', -- 'betaald' | 'open' | 'te_laat'
  -- AI Visuals (Higgsfield Soul)
  soul_character_id   text,
  reference_image_url text,
  brand_prompt        text,
  -- Brand-context (onboarding)
  brand_identity   text,
  brand_story      text,
  brand_strategy   text,
  brand_voice      text,
  notes            text,
  created_at       timestamptz not null default now()
);

-- ── Editors (voor productie + uitbetalingen) ────────────────────
create table if not exists editors (
  id            uuid primary key default gen_random_uuid(),
  agency_id     uuid not null references agencies (id) on delete cascade,
  name          text not null,
  email         text,
  pay_per_video numeric default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ── Integraties (stuurt de "verbonden / niet verbonden"-UI) ─────
create type integration_provider as enum
  ('instagram_scrape', 'instagram_graph', 'youtube', 'manychat');
create type integration_status as enum ('connected', 'error', 'disconnected');

create table if not exists integrations (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references agencies (id) on delete cascade,
  client_id    uuid references clients (id) on delete cascade,
  provider     integration_provider not null,
  status       integration_status not null default 'disconnected',
  -- Tokens versleuteld opslaan (of via Supabase Vault). Nooit plain.
  access_token   text,
  refresh_token  text,
  token_expires  timestamptz,
  external_id    text,            -- bv. IG user id / YT channel id
  last_synced_at timestamptz,     -- wanneer voor het laatst echt opgehaald
  last_error     text,            -- laatste foutmelding (voor UI)
  created_at     timestamptz not null default now(),
  unique (client_id, provider)
);

-- ── Content ──────────────────────────────────────────────────────
-- Pipeline-fases zijn app-gestuurd (vrij tekstveld) zodat we ze kunnen
-- aanpassen zonder DB-migratie. Huidige set (Monday-workflow):
--   ideation, ready_for_editing, quality_control, revisions_needed,
--   revisions_completed, client_approval, ready_for_posting, posted
create type content_format as enum ('Reel', 'Carrousel', 'Story', 'Short');

create table if not exists content (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients (id) on delete cascade,
  title        text not null,
  hook         text,
  script       text,
  format       content_format not null default 'Reel',
  stage        text           not null default 'ideation',
  -- Koppeling naar de echte post zodra live
  source       integration_provider,
  external_id  text,            -- post-/video-id bij het platform
  permalink    text,
  published_at timestamptz,
  -- Productie-velden (Monday: Type, Deadline, Posting Date, editor)
  content_type text,
  deadline     date,
  posting_date date,
  editor_id    uuid references editors (id) on delete set null,
  delivered_at timestamptz,     -- wanneer de editor aanleverde
  paid         boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── Content-metrics: ELKE rij = bron + tijdstempel ──────────────
-- Geen tijdstempel/bron = geen echte data. Snapshots per ophaalmoment.
create table if not exists content_metrics (
  id          uuid primary key default gen_random_uuid(),
  content_id  uuid not null references content (id) on delete cascade,
  source      integration_provider not null,
  views       bigint,
  reach       bigint,
  likes       bigint,
  comments    bigint,
  saves       bigint,
  fetched_at  timestamptz not null default now()
);
create index if not exists idx_metrics_content on content_metrics (content_id, fetched_at desc);

-- ── Leads (sales pipeline, gevoed door ManyChat/DM) ─────────────
create type lead_stage as enum
  ('nieuw', 'gekwalificeerd', 'call_gepland', 'closed', 'verloren');

create table if not exists leads (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references clients (id) on delete cascade,
  -- Welke content leverde deze lead op (omzet-attributie)
  source_content_id uuid references content (id) on delete set null,
  source_label      text,           -- bv. "ManyChat: 'GIDS'"
  external_id       text,           -- ManyChat subscriber id
  name              text,
  stage             lead_stage not null default 'nieuw',
  value             numeric default 0,
  setter            text,
  created_at        timestamptz not null default now(),
  closed_at         timestamptz
);
create index if not exists idx_leads_client on leads (client_id, stage);

-- ════════════════════════════════════════════════════════════════
-- Row Level Security — iedereen ziet alleen zijn eigen agency-data.
-- ════════════════════════════════════════════════════════════════
alter table agencies        enable row level security;
alter table profiles        enable row level security;
alter table clients         enable row level security;
alter table integrations    enable row level security;
alter table content         enable row level security;
alter table content_metrics enable row level security;
alter table leads           enable row level security;

-- Helper: agency_id van de huidige gebruiker
create or replace function current_agency_id() returns uuid
language sql stable security definer set search_path = public as $$
  select agency_id from profiles where user_id = auth.uid()
$$;

-- Helper: client_id van de huidige gebruiker (null voor owner/team)
create or replace function current_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select client_id from profiles where user_id = auth.uid()
$$;

-- Owner/team zien alle klanten van hun agency; client-login ziet alleen
-- de eigen klant. Policies hieronder dekken het basisgeval; verfijnen
-- we per tabel bij het bouwen van de portal-rol.
create policy "agency members read clients" on clients
  for select using (
    agency_id = current_agency_id()
    and (current_client_id() is null or id = current_client_id())
  );

create policy "agency members read content" on content
  for select using (
    client_id in (select id from clients where agency_id = current_agency_id())
    and (current_client_id() is null or client_id = current_client_id())
  );

create policy "agency members read metrics" on content_metrics
  for select using (
    content_id in (
      select id from content where client_id in (
        select id from clients where agency_id = current_agency_id()
      )
    )
  );

create policy "agency members read leads" on leads
  for select using (
    client_id in (select id from clients where agency_id = current_agency_id())
    and (current_client_id() is null or client_id = current_client_id())
  );

create policy "agency members read integrations" on integrations
  for select using (agency_id = current_agency_id());

create policy "members read own profile" on profiles
  for select using (user_id = auth.uid() or agency_id = current_agency_id());

create policy "owner reads agency" on agencies
  for select using (id = current_agency_id());

-- ── Schrijfrechten: alleen owner/team (geen client-logins) ──────
create policy "team insert clients" on clients
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);
create policy "team update clients" on clients
  for update using (agency_id = current_agency_id() and current_client_id() is null);
create policy "team delete clients" on clients
  for delete using (agency_id = current_agency_id() and current_client_id() is null);

create policy "team insert content" on content
  for insert with check (
    current_client_id() is null
    and client_id in (select id from clients where agency_id = current_agency_id())
  );
create policy "team update content" on content
  for update using (
    current_client_id() is null
    and client_id in (select id from clients where agency_id = current_agency_id())
  );
create policy "team delete content" on content
  for delete using (
    current_client_id() is null
    and client_id in (select id from clients where agency_id = current_agency_id())
  );

create policy "team insert leads" on leads
  for insert with check (
    current_client_id() is null
    and client_id in (select id from clients where agency_id = current_agency_id())
  );
create policy "team update leads" on leads
  for update using (
    current_client_id() is null
    and client_id in (select id from clients where agency_id = current_agency_id())
  );

-- ════════════════════════════════════════════════════════════════
-- Notificaties (bell + e-mail) en content-to-do's per klant.
-- ════════════════════════════════════════════════════════════════
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies (id) on delete cascade,
  client_id   uuid references clients (id) on delete cascade,
  audience    text not null default 'client',  -- 'client' | 'agency'
  type        text not null default 'info',    -- 'ideation' | 'approval' | 'todo' | 'info'
  title       text not null,
  body        text,
  link        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_notif_client on notifications (client_id, read, created_at desc);

create table if not exists todos (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies (id) on delete cascade,
  client_id   uuid not null references clients (id) on delete cascade,
  title       text not null,
  done        boolean not null default false,
  due         date,
  created_at  timestamptz not null default now()
);
create index if not exists idx_todos_client on todos (client_id, done);

alter table notifications enable row level security;
alter table todos         enable row level security;

-- Lezen: agency-team alles van de agency; client-login alleen eigen klant.
create policy "read notifications" on notifications
  for select using (
    agency_id = current_agency_id()
    and (current_client_id() is null or client_id = current_client_id())
  );
create policy "team insert notifications" on notifications
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);
create policy "update notifications" on notifications
  for update using (
    agency_id = current_agency_id()
    and (current_client_id() is null or client_id = current_client_id())
  );

create policy "read todos" on todos
  for select using (
    agency_id = current_agency_id()
    and (current_client_id() is null or client_id = current_client_id())
  );
create policy "team insert todos" on todos
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);
create policy "update todos" on todos
  for update using (
    agency_id = current_agency_id()
    and (current_client_id() is null or client_id = current_client_id())
  );

-- Editors: alleen owner/team.
alter table editors enable row level security;
create policy "read editors" on editors
  for select using (agency_id = current_agency_id() and current_client_id() is null);
create policy "team insert editors" on editors
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);
create policy "team update editors" on editors
  for update using (agency_id = current_agency_id() and current_client_id() is null);

-- Editor-login koppelen aan een editor-record (forward reference -> ALTER).
alter table profiles add column if not exists editor_id uuid references editors (id) on delete set null;

-- ── Outreach-pijplijn (nieuwe klanten werven) ───────────────────
create table if not exists prospects (
  id              uuid primary key default gen_random_uuid(),
  agency_id       uuid not null references agencies (id) on delete cascade,
  name            text not null,
  instagram       text,
  youtube         text,
  weakness        text,
  stage           text not null default 'te_contacteren',
  potential_value numeric default 0,
  note            text,
  message         text,            -- kant-en-klaar DM-bericht
  external_id     text,            -- herkomst (bv. 'monday:<id>') voor idempotente imports
  created_at      timestamptz not null default now()
);
create index if not exists idx_prospects_agency on prospects (agency_id, stage);
create unique index if not exists idx_prospects_external
  on prospects (external_id) where external_id is not null;
alter table prospects enable row level security;
create policy "read prospects" on prospects
  for select using (agency_id = current_agency_id() and current_client_id() is null);
create policy "team insert prospects" on prospects
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);
create policy "team update prospects" on prospects
  for update using (agency_id = current_agency_id() and current_client_id() is null);

-- ── Eden: Capture-boards + Discover-swipefile ───────────────────
create table if not exists captures (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies (id) on delete cascade,
  board       text not null default 'Swipe file',
  kind        text not null default 'link',
  title       text not null,
  url         text,
  body        text,
  source      text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_captures_agency on captures (agency_id, board, created_at desc);
alter table captures enable row level security;
create policy "read captures" on captures
  for select using (agency_id = current_agency_id() and current_client_id() is null);
create policy "team insert captures" on captures
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);
create policy "team update captures" on captures
  for update using (agency_id = current_agency_id() and current_client_id() is null);
create policy "team delete captures" on captures
  for delete using (agency_id = current_agency_id() and current_client_id() is null);

-- ── AI Visuals (Higgsfield Soul) generatie-historie ─────────────
create table if not exists generations (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies (id) on delete cascade,
  client_id   uuid references clients (id) on delete cascade,
  kind        text not null default 'image',
  prompt      text,
  output_url  text,
  status      text not null default 'done',
  created_at  timestamptz not null default now()
);
create index if not exists idx_generations_client on generations (client_id, created_at desc);
alter table generations enable row level security;
create policy "read generations" on generations
  for select using (agency_id = current_agency_id() and current_client_id() is null);
create policy "team insert generations" on generations
  for insert with check (agency_id = current_agency_id() and current_client_id() is null);

-- ── Intake (brand voice) + opdrachten per klant (migratie 010) ──
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
create policy "team all orders" on orders
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);
create policy "client read own orders" on orders
  for select using (agency_id = current_agency_id() and client_id = current_client_id());

-- ── Transcripten per klant — brand voice bron (migratie 011) ────
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
create policy "team all transcripts" on transcripts
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

-- ── Opdrachten: factuurmaand + referentie (migratie 012) ────────
alter table orders add column if not exists invoice_month date;
alter table orders add column if not exists invoice_ref   text;

-- ── Brand-kleuren per klant (migratie 013) ──────────────────────
alter table clients add column if not exists brand_primary   text;
alter table clients add column if not exists brand_secondary text;

-- ── 1. Competitors (Discover) ───────────────────────────────────
create table if not exists competitors (
  id             uuid primary key default gen_random_uuid(),
  agency_id      uuid not null references agencies(id) on delete cascade,
  handle         text not null,           -- IG-handle (@…)
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

-- ── 2. Editor-pool ──────────────────────────────────────────────
alter table editors add column if not exists specialty     text;  -- bv. 'talking head', 'motion design'
alter table editors add column if not exists pool_status   text not null default 'actief'; -- actief | pool | gestopt
alter table editors add column if not exists contact       text;  -- WhatsApp/e-mail/Discord
alter table editors add column if not exists portfolio_url text;
alter table editors add column if not exists notes         text;

-- ── 3. Lead follow-ups ──────────────────────────────────────────
alter table leads add column if not exists next_followup  date;
alter table leads add column if not exists followup_note  text;

-- ── Daily Brief: dagelijkse content-ideeën per klant (migratie 015) ──
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
create policy "team all brief_ideas" on brief_ideas
  for all using (agency_id = current_agency_id() and current_client_id() is null)
  with check (agency_id = current_agency_id() and current_client_id() is null);

-- ── Editor-werkflow: files-link per kaart (migratie 016) ────────
alter table content add column if not exists brief_url text;

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

-- ── Account-snapshots: volgers per kanaal per sync (migratie 018) ──
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


-- ── Moneybird: geziene facturen (cron meldt alleen nieuwe) ──────
create table if not exists seen_invoices (
  id      text primary key,
  seen_at timestamptz not null default now()
);
alter table seen_invoices enable row level security;

-- ── Scripts-bibliotheek ─────────────────────────────────────────
-- Alles wat eerst los op mennokater.nl gehost werd: video-scripts met
-- status (nog schrijven → klaar om op te nemen → opgenomen), optioneel
-- per klant en met een tag (bv. "Mexico") voor trip-voorbereiding.
-- Inline bewerken met autosave op /platform/scripts.

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
