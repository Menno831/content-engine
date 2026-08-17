-- ════════════════════════════════════════════════════════════════
-- Migratie 018 — Account-snapshots (volgers per kanaal, per sync).
-- Elke sync (3x per dag) legt volgers/posts vast, zodat je groei
-- per dagdeel kunt volgen op Instagram én YouTube.
-- Draai in de Supabase SQL Editor, ná 017.
-- ════════════════════════════════════════════════════════════════

create table if not exists account_metrics (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients (id) on delete cascade,
  source     text not null,            -- instagram_scrape | instagram_graph | youtube
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
