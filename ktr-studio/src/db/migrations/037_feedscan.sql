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
