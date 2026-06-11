-- ════════════════════════════════════════════════════════════════
-- Migratie 014 — Discover-competitors, editor-pool, lead-follow-ups.
-- 1) Competitors volgen: posts syncen, outliers automatisch spotten.
-- 2) Editor-pool: specialiteit/contact/notities zodat je nooit zonder zit.
-- 3) Leads: follow-up datum zodat setters weten wie ze vandaag opvolgen.
-- Draai in de Supabase SQL Editor, ná 013.
-- ════════════════════════════════════════════════════════════════

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
