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
