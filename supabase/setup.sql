-- ═══════════════════════════════════════════════════════════
-- LA CANTINA — Setup completo para un proyecto Supabase NUEVO
-- Ejecutar una vez en: Supabase Dashboard → SQL Editor
--
-- Reemplaza a lib/supabase/schema.sql + supabase/migrations/*
-- para proyectos nuevos (esos archivos, ejecutados en orden, dejan
-- registrations.tournament_id como UUID y fallan las inscripciones).
-- Es re-ejecutable: si algo falla, corregir y correr de nuevo.
-- ═══════════════════════════════════════════════════════════

-- ── Perfiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  discord_id            TEXT UNIQUE,
  discord_username      TEXT,
  display_name          TEXT,
  avatar_url            TEXT,
  banner_url            TEXT,
  email                 TEXT,
  statlocker_url        TEXT,
  statlocker_updated_at TIMESTAMPTZ,
  deadlock_rank         TEXT,
  rank_updated_at       TIMESTAMPTZ,
  team_name             TEXT,
  player_role           TEXT,
  is_admin              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para crear/actualizar perfil al conectar Discord
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  discord_uid TEXT;
  banner_hash TEXT;
  computed_banner_url TEXT;
BEGIN
  discord_uid  := NEW.raw_user_meta_data->>'provider_id';
  banner_hash  := NEW.raw_user_meta_data->>'banner';

  IF banner_hash IS NOT NULL AND discord_uid IS NOT NULL THEN
    computed_banner_url := 'https://cdn.discordapp.com/banners/' || discord_uid || '/' || banner_hash || '.png?size=480';
  ELSE
    computed_banner_url := NULL;
  END IF;

  INSERT INTO public.profiles (
    id, discord_id, discord_username, display_name, avatar_url, banner_url, email, updated_at
  )
  -- Discord ya no manda user_name: el @handle viene en full_name
  -- y el nombre visible en custom_claims.global_name.
  VALUES (
    NEW.id,
    discord_uid,
    COALESCE(NEW.raw_user_meta_data->>'user_name', NEW.raw_user_meta_data->>'full_name'),
    COALESCE(NEW.raw_user_meta_data->'custom_claims'->>'global_name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'avatar_url',
    computed_banner_url,
    NEW.email,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    discord_id       = EXCLUDED.discord_id,
    discord_username = EXCLUDED.discord_username,
    display_name     = COALESCE(profiles.display_name, EXCLUDED.display_name),
    avatar_url       = EXCLUDED.avatar_url,
    banner_url       = EXCLUDED.banner_url,
    email            = EXCLUDED.email,
    updated_at       = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ¿El usuario actual es admin? SECURITY DEFINER para poder usarla en
-- policies de profiles sin recursión infinita.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), FALSE);
$$;

-- Evita que un usuario se auto-asigne is_admin vía "Profiles: own write".
-- Desde el SQL Editor (sin auth.uid()) sí se puede cambiar.
CREATE OR REPLACE FUNCTION public.guard_is_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin()
     AND NEW.is_admin IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.is_admin ELSE FALSE END) THEN
    RAISE EXCEPTION 'No autorizado para cambiar is_admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS guard_is_admin ON public.profiles;
CREATE TRIGGER guard_is_admin
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_is_admin();

-- ── Torneos (id = slug de texto) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tournaments (
  id           TEXT        PRIMARY KEY,   -- slug, ej. 'street-brawl-s1'
  name         TEXT        NOT NULL,
  format       TEXT        NOT NULL DEFAULT '4v4',
  date_display TEXT                 DEFAULT 'Por definir',
  time_display TEXT                 DEFAULT 'Por definir',
  status       TEXT        NOT NULL DEFAULT 'soon'
                 CHECK (status IN ('open', 'soon', 'live', 'closed')),
  max_slots    INTEGER     NOT NULL DEFAULT 32,
  prize        TEXT                 DEFAULT 'Por definir',
  region       TEXT        NOT NULL DEFAULT 'LATAM',
  featured     BOOLEAN     NOT NULL DEFAULT FALSE,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Inscripciones ────────────────────────────────────────────────────────────
-- La FK a tournaments es necesaria para el embed tournaments(name).
CREATE TABLE IF NOT EXISTS public.registrations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id   TEXT REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES auth.users ON DELETE SET NULL,
  team_name       TEXT,
  captain_nick    TEXT NOT NULL,
  captain_discord TEXT NOT NULL,
  region          TEXT,
  members         TEXT,
  experience      TEXT,
  status          TEXT DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, captain_discord)
);

-- ── Equipos ──────────────────────────────────────────────────────────────────
-- Las FK de team_members.user_id y team_applications.applicant_id quedan
-- inline a propósito: el código usa sus nombres por defecto
-- (team_members_user_id_fkey, team_applications_applicant_id_fkey).
CREATE TABLE IF NOT EXISTS public.teams (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE,
  captain_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  region      TEXT,
  logo_url    TEXT,
  description TEXT,
  commitment  TEXT CHECK (commitment IN ('Serio', 'Por diversión')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id   UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id    UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  invitee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status     TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, invitee_id)
);

CREATE TABLE IF NOT EXISTS public.team_applications (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id      UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  applicant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, applicant_id)
);

-- ── Notificaciones ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT,
  data        JSONB       NOT NULL DEFAULT '{}',
  read        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Realtime para la campanita de notificaciones
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ── Permisos (default de Supabase; explícito por si el proyecto no los da) ───
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Profiles: public read"  ON public.profiles;
DROP POLICY IF EXISTS "Profiles: own write"    ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admin update" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admin delete" ON public.profiles;
CREATE POLICY "Profiles: public read"  ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "Profiles: own write"    ON public.profiles FOR ALL    USING (auth.uid() = id);
CREATE POLICY "Profiles: admin update" ON public.profiles FOR UPDATE USING (public.is_admin());
CREATE POLICY "Profiles: admin delete" ON public.profiles FOR DELETE USING (public.is_admin());

-- Tournaments
DROP POLICY IF EXISTS "public_read_tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "admin_write_tournaments" ON public.tournaments;
CREATE POLICY "public_read_tournaments" ON public.tournaments FOR SELECT USING (TRUE);
CREATE POLICY "admin_write_tournaments" ON public.tournaments FOR ALL    USING (public.is_admin());

-- Registrations: lectura pública (listas de inscriptos y contadores)
DROP POLICY IF EXISTS "Registrations: public read"   ON public.registrations;
DROP POLICY IF EXISTS "Registrations: public insert" ON public.registrations;
DROP POLICY IF EXISTS "Registrations: admin all"     ON public.registrations;
CREATE POLICY "Registrations: public read"   ON public.registrations FOR SELECT USING (TRUE);
CREATE POLICY "Registrations: public insert" ON public.registrations FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Registrations: admin all"     ON public.registrations FOR ALL    USING (public.is_admin());

-- Teams
DROP POLICY IF EXISTS "Teams: public read"    ON public.teams;
DROP POLICY IF EXISTS "Teams: captain insert" ON public.teams;
DROP POLICY IF EXISTS "Teams: captain update" ON public.teams;
DROP POLICY IF EXISTS "Teams: captain delete" ON public.teams;
CREATE POLICY "Teams: public read"    ON public.teams FOR SELECT USING (TRUE);
CREATE POLICY "Teams: captain insert" ON public.teams FOR INSERT WITH CHECK (auth.uid() = captain_id);
CREATE POLICY "Teams: captain update" ON public.teams FOR UPDATE USING (auth.uid() = captain_id);
CREATE POLICY "Teams: captain delete" ON public.teams FOR DELETE USING (auth.uid() = captain_id);

-- Team members (el capitán puede kickear)
DROP POLICY IF EXISTS "Members: public read"    ON public.team_members;
DROP POLICY IF EXISTS "Members: insert"         ON public.team_members;
DROP POLICY IF EXISTS "Members: delete own"     ON public.team_members;
DROP POLICY IF EXISTS "Members: captain delete" ON public.team_members;
CREATE POLICY "Members: public read"    ON public.team_members FOR SELECT USING (TRUE);
CREATE POLICY "Members: insert"         ON public.team_members FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Members: delete own"     ON public.team_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Members: captain delete" ON public.team_members FOR DELETE
  USING (auth.uid() IN (SELECT captain_id FROM public.teams WHERE id = team_id));

-- Invitations
DROP POLICY IF EXISTS "Invitations: read"           ON public.team_invitations;
DROP POLICY IF EXISTS "Invitations: captain insert" ON public.team_invitations;
DROP POLICY IF EXISTS "Invitations: invitee update" ON public.team_invitations;
CREATE POLICY "Invitations: read"           ON public.team_invitations FOR SELECT
  USING (auth.uid() = invitee_id OR auth.uid() IN (SELECT captain_id FROM public.teams WHERE id = team_id));
CREATE POLICY "Invitations: captain insert" ON public.team_invitations FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT captain_id FROM public.teams WHERE id = team_id));
CREATE POLICY "Invitations: invitee update" ON public.team_invitations FOR UPDATE
  USING (auth.uid() = invitee_id);

-- Applications (el jugador puede borrar las suyas al salir del equipo)
DROP POLICY IF EXISTS "Applications: read"           ON public.team_applications;
DROP POLICY IF EXISTS "Applications: insert"         ON public.team_applications;
DROP POLICY IF EXISTS "Applications: captain update" ON public.team_applications;
DROP POLICY IF EXISTS "Applications: delete own"     ON public.team_applications;
CREATE POLICY "Applications: read"           ON public.team_applications FOR SELECT
  USING (auth.uid() = applicant_id OR auth.uid() IN (SELECT captain_id FROM public.teams WHERE id = team_id));
CREATE POLICY "Applications: insert"         ON public.team_applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "Applications: captain update" ON public.team_applications FOR UPDATE
  USING (auth.uid() IN (SELECT captain_id FROM public.teams WHERE id = team_id));
CREATE POLICY "Applications: delete own"     ON public.team_applications FOR DELETE USING (auth.uid() = applicant_id);

-- Notifications
DROP POLICY IF EXISTS "own_notifications" ON public.notifications;
CREATE POLICY "own_notifications" ON public.notifications FOR ALL USING (user_id = auth.uid());

-- ── Storage: logos de equipos (bucket "avatars") ─────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatars: public read" ON storage.objects;
DROP POLICY IF EXISTS "Avatars: auth upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatars: auth update" ON storage.objects;
CREATE POLICY "Avatars: public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "Avatars: auth upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Avatars: auth update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

-- ═══════════════════════════════════════════════════════════
-- Funciones de comunidad (también en supabase/migrations/20260929_comunidad.sql)
-- ═══════════════════════════════════════════════════════════

-- ── Torneos: fecha real, check-in, tipo de llave y campeón ───────────────────
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS starts_at        TIMESTAMPTZ;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS checkin_minutes  INTEGER NOT NULL DEFAULT 60;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS bracket_type     TEXT    NOT NULL DEFAULT 'single';
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS winner_registration_id UUID
  REFERENCES public.registrations(id) ON DELETE SET NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_bracket_type_check') THEN
    ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_bracket_type_check
      CHECK (bracket_type IN ('single', 'double'));
  END IF;
END $$;

-- ── Inscripciones: equipo, jugadores, check-in y seed ────────────────────────
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS team_id       UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS player_ids    UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS seed          INTEGER;

-- ── Perfiles: rango de Deadlock, país y banner propio ────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rank_badge        INTEGER;  -- tier*10 + subrango (ej. 84 = Oracle 4)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country           TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_banner_url TEXT;     -- tiene prioridad sobre el banner de Discord

-- El usuario no puede editar su propio is_admin ni su rango (el rango lo escribe el servidor)
CREATE OR REPLACE FUNCTION public.guard_is_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.is_admin IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.is_admin ELSE FALSE END) THEN
      RAISE EXCEPTION 'No autorizado para cambiar is_admin';
    END IF;
    IF TG_OP = 'UPDATE' AND (NEW.rank_badge IS DISTINCT FROM OLD.rank_badge
                          OR NEW.deadlock_rank IS DISTINCT FROM OLD.deadlock_rank
                          OR NEW.rank_updated_at IS DISTINCT FROM OLD.rank_updated_at) THEN
      RAISE EXCEPTION 'El rango lo actualiza el servidor';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Partidas de la llave ─────────────────────────────────────────────────────
-- bracket: W = ganadores (o llave simple), L = perdedores, GF = gran final (round 2 = reset)
CREATE TABLE IF NOT EXISTS public.matches (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id       TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  bracket             TEXT NOT NULL DEFAULT 'W' CHECK (bracket IN ('W', 'L', 'GF')),
  round               INTEGER NOT NULL,
  position            INTEGER NOT NULL,
  reg_a               UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  reg_b               UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  bye_a               BOOLEAN NOT NULL DEFAULT FALSE,   -- el lado A es un pase libre
  bye_b               BOOLEAN NOT NULL DEFAULT FALSE,
  score_a             INTEGER,
  score_b             INTEGER,
  winner_id           UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  next_match_id       UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  next_slot           TEXT CHECK (next_slot IN ('a', 'b')),
  loser_next_match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  loser_next_slot     TEXT CHECK (loser_next_slot IN ('a', 'b')),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'done', 'skipped')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tournament_id, bracket, round, position)
);
CREATE INDEX IF NOT EXISTS matches_tournament_idx ON public.matches (tournament_id);

-- ── Tablón: busco equipo / busco jugadores ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lfg_posts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id     UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('player', 'team')),
  roles       TEXT[] NOT NULL DEFAULT '{}',
  rank_min    INTEGER,
  country     TEXT,
  schedule    TEXT CHECK (char_length(schedule) <= 120),
  message     TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lfg_posts_created_idx ON public.lfg_posts (created_at DESC);

-- ── Scrims (partidas de práctica, privadas entre dos equipos) ────────────────
CREATE TABLE IF NOT EXISTS public.scrims (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_team    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  to_team      UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  proposed_at  TIMESTAMPTZ NOT NULL,
  message      TEXT CHECK (char_length(message) <= 300),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  CHECK (from_team <> to_team)
);

-- ── Eventos de la comunidad (los crea el admin) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  starts_at    TIMESTAMPTZ NOT NULL,
  url          TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Permisos ─────────────────────────────────────────────────────────────────
GRANT ALL ON public.matches, public.lfg_posts, public.scrims, public.events TO anon, authenticated, service_role;

ALTER TABLE public.matches   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lfg_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrims    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events    ENABLE ROW LEVEL SECURITY;

-- Matches: lectura pública, escritura admin
DROP POLICY IF EXISTS "Matches: public read" ON public.matches;
DROP POLICY IF EXISTS "Matches: admin all"   ON public.matches;
CREATE POLICY "Matches: public read" ON public.matches FOR SELECT USING (TRUE);
CREATE POLICY "Matches: admin all"   ON public.matches FOR ALL    USING (public.is_admin());

-- Tablón: lectura pública; cada uno maneja sus publicaciones; el admin puede borrar
DROP POLICY IF EXISTS "LFG: public read"   ON public.lfg_posts;
DROP POLICY IF EXISTS "LFG: own insert"    ON public.lfg_posts;
DROP POLICY IF EXISTS "LFG: own update"    ON public.lfg_posts;
DROP POLICY IF EXISTS "LFG: own delete"    ON public.lfg_posts;
CREATE POLICY "LFG: public read" ON public.lfg_posts FOR SELECT USING (TRUE);
CREATE POLICY "LFG: own insert"  ON public.lfg_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "LFG: own update"  ON public.lfg_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "LFG: own delete"  ON public.lfg_posts FOR DELETE USING (auth.uid() = author_id OR public.is_admin());

-- Scrims: solo los miembros de los dos equipos los ven; los capitanes los crean/responden
DROP POLICY IF EXISTS "Scrims: teams read"      ON public.scrims;
DROP POLICY IF EXISTS "Scrims: captain insert"  ON public.scrims;
DROP POLICY IF EXISTS "Scrims: captains update" ON public.scrims;
CREATE POLICY "Scrims: teams read" ON public.scrims FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.team_members WHERE team_id IN (from_team, to_team)));
CREATE POLICY "Scrims: captain insert" ON public.scrims FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT captain_id FROM public.teams WHERE id = from_team));
CREATE POLICY "Scrims: captains update" ON public.scrims FOR UPDATE
  USING (auth.uid() IN (SELECT captain_id FROM public.teams WHERE id IN (from_team, to_team)));

-- Eventos: lectura pública, escritura admin
DROP POLICY IF EXISTS "Events: public read" ON public.events;
DROP POLICY IF EXISTS "Events: admin all"   ON public.events;
CREATE POLICY "Events: public read" ON public.events FOR SELECT USING (TRUE);
CREATE POLICY "Events: admin all"   ON public.events FOR ALL    USING (public.is_admin());

-- ── Storage: banners de perfil en el bucket "avatars" (carpeta banners/) ─────
-- Las políticas de avatars ya permiten subir a usuarios autenticados.
