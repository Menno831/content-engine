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
  created_at  timestamptz not null default now()
);

-- ── Profielen (koppelt auth-users aan een agency + rol) ─────────
create type member_role as enum ('owner', 'team', 'client');

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
  id             uuid primary key default gen_random_uuid(),
  agency_id      uuid not null references agencies (id) on delete cascade,
  name           text not null,
  ig_handle      text,
  yt_channel_id  text,
  status         client_status not null default 'onboarding',
  monthly_value  numeric default 0,
  created_at     timestamptz not null default now()
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
create type content_stage  as enum ('idee', 'script', 'review', 'goedgekeurd', 'live');
create type content_format as enum ('Reel', 'Carrousel', 'Story', 'Short');

create table if not exists content (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients (id) on delete cascade,
  title        text not null,
  hook         text,
  script       text,
  format       content_format not null default 'Reel',
  stage        content_stage  not null default 'idee',
  -- Koppeling naar de echte post zodra live
  source       integration_provider,
  external_id  text,            -- post-/video-id bij het platform
  permalink    text,
  published_at timestamptz,
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
