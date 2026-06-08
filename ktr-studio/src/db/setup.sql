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
  captures, generations, prospects, content_metrics, leads, content,
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
  created_at      timestamptz not null default now()
);
create index if not exists idx_prospects_agency on prospects (agency_id, stage);
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
