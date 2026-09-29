-- ═══════════════════════════════════════════════════════════
-- LA CANTINA — Mapa de coaching
-- Tableros sobre el minimapa (líneas, flechas, héroes, notas) que se comparten por enlace.
-- Ejecutar UNA vez en: Supabase Dashboard → SQL Editor (es re-ejecutable).
-- Solo agrega una tabla; no modifica datos existentes.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.boards (
  id          TEXT PRIMARY KEY CHECK (id ~ '^[A-Z0-9]{6}$'),     -- código para compartir
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Plan sin título' CHECK (char_length(title) BETWEEN 1 AND 80),
  data        JSONB NOT NULL DEFAULT '{"elements": [], "layers": {}}',
  draft_id    TEXT REFERENCES public.drafts(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS boards_created_by_idx ON public.boards (created_by, updated_at DESC);

-- Lectura pública (se comparte por enlace); sin políticas de escritura: los cambios
-- pasan por las APIs del sitio, que validan que seas el dueño.
GRANT SELECT ON public.boards TO anon, authenticated;
GRANT ALL    ON public.boards TO service_role;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Boards: public read" ON public.boards;
CREATE POLICY "Boards: public read" ON public.boards FOR SELECT USING (TRUE);

-- Tiempo real: quien mira el enlace ve los cambios del coach mientras dibuja
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'boards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.boards;
  END IF;
END $$;
