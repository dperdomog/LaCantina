-- ============================================================
-- Tabla notifications
-- ============================================================
create table if not exists notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references profiles(id) on delete cascade,
  type        text        not null,   -- team_invite | team_accepted | team_declined | tournament_open | tournament_live | tournament_closed
  title       text        not null,
  body        text,
  data        jsonb       not null default '{}',
  read        boolean     not null default false,
  created_at  timestamptz not null default now()
);

alter table notifications enable row level security;

drop policy if exists "own_notifications" on notifications;
create policy "own_notifications"
  on notifications for all
  using (user_id = auth.uid());

-- Habilitar Realtime para recibir inserts en tiempo real
alter publication supabase_realtime add table notifications;
