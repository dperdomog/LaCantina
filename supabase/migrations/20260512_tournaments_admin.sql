-- ============================================================
-- 1. Columna is_admin en profiles
-- ============================================================
alter table profiles
  add column if not exists is_admin boolean not null default false;

-- ============================================================
-- 2. Tabla tournaments
-- Dropeamos y recreamos con id TEXT (slug URL-friendly).
-- La tabla existente tenía id UUID por defecto de Supabase.
-- registrations.tournament_id es TEXT, sin conflicto.
-- ============================================================
drop table if exists tournaments cascade;

create table tournaments (
  id           text        primary key,   -- slug, ej. 'street-brawl-s1'
  name         text        not null,
  format       text        not null default '4v4',
  date_display text                 default 'Por definir',
  time_display text                 default 'Por definir',
  status       text        not null default 'soon'
                 check (status in ('open', 'soon', 'live', 'closed')),
  max_slots    integer     not null default 32,
  prize        text                 default 'Por definir',
  region       text        not null default 'LATAM',
  featured     boolean     not null default false,
  description  text,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 3. RLS
-- ============================================================
alter table tournaments enable row level security;

-- Policies idempotentes (drop + recrear)
drop policy if exists "public_read_tournaments"  on tournaments;
drop policy if exists "admin_write_tournaments"  on tournaments;

create policy "public_read_tournaments"
  on tournaments for select
  using (true);

create policy "admin_write_tournaments"
  on tournaments for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );

-- ============================================================
-- 4. Migrar torneo hardcodeado existente
-- ============================================================
insert into tournaments (id, name, format, status, max_slots, region, featured)
values (
  'street-brawl-s1',
  'Street Brawl — Temporada 1',
  '4v4',
  'open',
  32,
  'LATAM',
  true
)
on conflict (id) do nothing;

-- ============================================================
-- 5. (Opcional) FK de registrations → tournaments
--    Ejecutar solo si registrations.tournament_id es text
--    y no hay datos huérfanos.
-- ============================================================
-- alter table registrations
--   add constraint fk_registrations_tournament
--   foreign key (tournament_id) references tournaments(id) on delete cascade;
