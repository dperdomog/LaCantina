-- ═══════════════════════════════════════════════════════════
-- LA CANTINA — Héroes nuevos habilitados por el admin
-- Los héroes anunciados en un parche se liberan de a poco (por votación en el juego).
-- El admin marca en Admin → Héroes cuáles ya salieron y entran al draft.
-- Ejecutar UNA vez en: Supabase Dashboard → SQL Editor (es re-ejecutable).
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hero_availability (
  hero_id     INTEGER PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT ON public.hero_availability TO anon, authenticated;
GRANT ALL    ON public.hero_availability TO service_role, authenticated;
ALTER TABLE public.hero_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hero availability: public read" ON public.hero_availability;
DROP POLICY IF EXISTS "Hero availability: admin all"   ON public.hero_availability;
CREATE POLICY "Hero availability: public read" ON public.hero_availability FOR SELECT USING (TRUE);
CREATE POLICY "Hero availability: admin all"   ON public.hero_availability FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
