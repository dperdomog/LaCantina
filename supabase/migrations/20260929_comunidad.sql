-- ═══════════════════════════════════════════════════════════
-- LA CANTINA — Funciones de comunidad
-- Llaves de torneo, check-in, tablón, scrims, eventos, ranking y banner.
-- Ejecutar UNA vez en: Supabase Dashboard → SQL Editor (es re-ejecutable).
-- Solo agrega columnas/tablas; no borra ni modifica datos existentes.
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
