-- ════════════════════════════════════════════════════════════════
-- Migratie 002 — Notificaties + content-to-do's per klant + contact-e-mail
-- Draai dit één keer in de Supabase SQL Editor op een bestaand project.
-- ════════════════════════════════════════════════════════════════

alter table clients add column if not exists contact_email text;

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies (id) on delete cascade,
  client_id   uuid references clients (id) on delete cascade,
  audience    text not null default 'client',
  type        text not null default 'info',
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
