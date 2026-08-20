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
