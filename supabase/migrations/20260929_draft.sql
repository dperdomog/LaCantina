-- ═══════════════════════════════════════════════════════════
-- LA CANTINA — Draft de picks y bans
-- Salas de draft en tiempo real (se pueden vincular a un scrim o a una partida de torneo).
-- Ejecutar UNA vez en: Supabase Dashboard → SQL Editor (es re-ejecutable).
-- Solo agrega una tabla; no modifica datos existentes.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.drafts (
  id              TEXT PRIMARY KEY CHECK (id ~ '^[A-Z0-9]{6}$'),   -- código de sala
  created_by      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  format          TEXT NOT NULL CHECK (format IN ('6v6', '4v4', '2v2')),
  bans_per_team   INTEGER NOT NULL DEFAULT 0 CHECK (bans_per_team BETWEEN 0 AND 6),
  timer_s         INTEGER NOT NULL DEFAULT 0 CHECK (timer_s IN (0, 30, 45, 60, 90)),
  name_a          TEXT NOT NULL DEFAULT 'Equipo A' CHECK (char_length(name_a) BETWEEN 1 AND 40),
  name_b          TEXT NOT NULL DEFAULT 'Equipo B' CHECK (char_length(name_b) BETWEEN 1 AND 40),
  captain_a       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  captain_b       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_a          UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  team_b          UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  scrim_id        UUID REFERENCES public.scrims(id) ON DELETE SET NULL,
  match_id        UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'drafting', 'done', 'cancelled')),
  step            INTEGER NOT NULL DEFAULT 0,                      -- = número de acciones hechas
  actions         JSONB NOT NULL DEFAULT '[]',                     -- [{type, side, hero_id, auto, at}]
  turn_started_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (captain_a IS NULL OR captain_b IS NULL OR captain_a <> captain_b)
);
CREATE INDEX IF NOT EXISTS drafts_created_by_idx ON public.drafts (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS drafts_scrim_idx      ON public.drafts (scrim_id) WHERE scrim_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS drafts_match_idx      ON public.drafts (match_id) WHERE match_id IS NOT NULL;

-- Lectura pública (espectadores); sin políticas de escritura: todo cambio pasa por
-- las APIs del sitio con la service role, que valida turnos y permisos.
GRANT SELECT ON public.drafts TO anon, authenticated;
GRANT ALL    ON public.drafts TO service_role;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drafts: public read" ON public.drafts;
CREATE POLICY "Drafts: public read" ON public.drafts FOR SELECT USING (TRUE);

-- Tiempo real: los clientes reciben cada cambio de la sala
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'drafts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drafts;
  END IF;
END $$;
