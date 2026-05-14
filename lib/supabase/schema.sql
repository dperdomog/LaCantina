-- ═══════════════════════════════════════════════════════════
-- LA CANTINA — Supabase Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── Perfiles de usuario (extiende auth.users de Supabase) ─────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  discord_id        TEXT UNIQUE,           -- ID numérico de Discord
  discord_username  TEXT,                  -- @handle (ej: "malaleche")
  display_name      TEXT,                  -- Nombre mostrado en Discord
  avatar_url        TEXT,                  -- URL del avatar
  banner_url        TEXT,                  -- URL del banner de perfil
  email             TEXT,                  -- Email de la cuenta Discord
  statlocker_url    TEXT,                  -- URL del perfil en StatLocker
  deadlock_rank     TEXT,                  -- Rango cacheado (ej: "Phantom III")
  rank_updated_at   TIMESTAMPTZ,           -- Última vez que se actualizó el rango
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
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

  -- Construir URL del banner si existe el hash
  IF banner_hash IS NOT NULL AND discord_uid IS NOT NULL THEN
    computed_banner_url := 'https://cdn.discordapp.com/banners/' || discord_uid || '/' || banner_hash || '.png?size=480';
  ELSE
    computed_banner_url := NULL;
  END IF;

  INSERT INTO public.profiles (
    id, discord_id, discord_username, display_name, avatar_url, banner_url, email, updated_at
  )
  VALUES (
    NEW.id,
    discord_uid,
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    computed_banner_url,
    NEW.email,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    discord_id       = EXCLUDED.discord_id,
    discord_username = EXCLUDED.discord_username,
    display_name     = EXCLUDED.display_name,
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

-- ── Torneos ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tournaments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  game         TEXT NOT NULL DEFAULT 'Deadlock',
  format       TEXT NOT NULL,             -- '6v6', '1v1', etc.
  date         DATE,
  status       TEXT NOT NULL DEFAULT 'open',  -- 'open', 'soon', 'closed'
  max_slots    INT NOT NULL DEFAULT 16,
  prize_info   TEXT,
  featured     BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Inscripciones ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.registrations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id   UUID REFERENCES public.tournaments ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES auth.users ON DELETE SET NULL,
  team_name       TEXT,
  captain_nick    TEXT NOT NULL,
  captain_discord TEXT NOT NULL,
  region          TEXT,
  members         TEXT,               -- lista de nicks separados por nueva línea
  experience      TEXT,               -- para torneos 1v1
  status          TEXT DEFAULT 'pending',  -- 'pending', 'confirmed', 'rejected'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, captain_discord)
);

-- ── RLS (Row Level Security) ───────────────────────────────────────────────────
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Profiles: lectura pública (username y avatar visibles para todos)
CREATE POLICY "Profiles: public read" ON public.profiles
  FOR SELECT USING (TRUE);

-- Profiles: solo el propio usuario puede modificar su perfil
CREATE POLICY "Profiles: own write" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Tournaments: todos pueden leer
CREATE POLICY "Tournaments: public read" ON public.tournaments
  FOR SELECT USING (TRUE);

-- Registrations: todos pueden insertar (inscribirse)
CREATE POLICY "Registrations: public insert" ON public.registrations
  FOR INSERT WITH CHECK (TRUE);

-- Registrations: usuario ve sus propias inscripciones
CREATE POLICY "Registrations: own read" ON public.registrations
  FOR SELECT USING (auth.uid() = user_id);

-- ── Migración: agregar columnas StatLocker si la tabla ya existe ───────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS statlocker_url   TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deadlock_rank    TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rank_updated_at  TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_name        TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS player_role      TEXT;

-- ── Equipos ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  captain_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  region      TEXT,
  logo_url    TEXT,
  description TEXT,
  commitment  TEXT CHECK (commitment IN ('Serio', 'Por diversión')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Miembros activos del equipo (incluyendo el capitán)
CREATE TABLE IF NOT EXISTS public.team_members (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id   UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)  -- un usuario solo puede estar en un equipo
);

-- Invitaciones del capitán a jugadores
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id    UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  invitee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status     TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, invitee_id)
);

-- Solicitudes de jugadores libres a equipos
CREATE TABLE IF NOT EXISTS public.team_applications (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id      UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  applicant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, applicant_id)
);

-- RLS de equipos
ALTER TABLE public.teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams: public read"          ON public.teams FOR SELECT USING (TRUE);
CREATE POLICY "Teams: captain insert"       ON public.teams FOR INSERT WITH CHECK (auth.uid() = captain_id);
CREATE POLICY "Teams: captain update"       ON public.teams FOR UPDATE USING (auth.uid() = captain_id);
CREATE POLICY "Teams: captain delete"       ON public.teams FOR DELETE USING (auth.uid() = captain_id);

CREATE POLICY "Members: public read"        ON public.team_members FOR SELECT USING (TRUE);
CREATE POLICY "Members: insert"             ON public.team_members FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Members: delete own"         ON public.team_members FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Invitations: read"           ON public.team_invitations FOR SELECT
  USING (auth.uid() = invitee_id OR auth.uid() IN (SELECT captain_id FROM public.teams WHERE id = team_id));
CREATE POLICY "Invitations: captain insert" ON public.team_invitations FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT captain_id FROM public.teams WHERE id = team_id));
CREATE POLICY "Invitations: invitee update" ON public.team_invitations FOR UPDATE
  USING (auth.uid() = invitee_id);

CREATE POLICY "Applications: read"          ON public.team_applications FOR SELECT
  USING (auth.uid() = applicant_id OR auth.uid() IN (SELECT captain_id FROM public.teams WHERE id = team_id));
CREATE POLICY "Applications: insert"        ON public.team_applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "Applications: captain update" ON public.team_applications FOR UPDATE
  USING (auth.uid() IN (SELECT captain_id FROM public.teams WHERE id = team_id));

-- ── Datos iniciales (torneos de ejemplo) ──────────────────────────────────────
INSERT INTO public.tournaments (slug, name, format, date, status, max_slots, prize_info, featured)
VALUES
  ('copa-cantina-jun2026', 'Copa La Cantina — Junio 2026', '6v6', '2026-06-15', 'open', 16, 'Reconocimiento + Roles', TRUE),
  ('showdown-semanal',     '1v1 Showdown — Semanal',       '1v1', NULL,         'open', 16, NULL,                    FALSE),
  ('gran-copa-ago2026',    'La Gran Copa — Agosto 2026',   '6v6', '2026-08-01', 'soon', 32, NULL,                    FALSE)
ON CONFLICT (slug) DO NOTHING;
