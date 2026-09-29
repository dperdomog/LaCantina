-- ═══════════════════════════════════════════════════════════
-- LA CANTINA — Moderación y estadísticas de partidas
-- Reportes, bloqueo de usuarios y caché de estadísticas de Deadlock.
-- Ejecutar UNA vez en: Supabase Dashboard → SQL Editor (es re-ejecutable).
-- Solo agrega columnas/tablas/políticas; no borra ni modifica datos existentes.
-- ═══════════════════════════════════════════════════════════

-- ── Bloqueo de usuarios ──────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at  TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- ¿El usuario actual está bloqueado? (SECURITY DEFINER para usarla en políticas)
CREATE OR REPLACE FUNCTION public.is_banned()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT banned_at IS NOT NULL FROM public.profiles WHERE id = auth.uid()), FALSE);
$$;

-- El usuario no puede editar su is_admin, su rango ni su bloqueo
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
    IF NEW.banned_at IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.banned_at ELSE NULL END)
       OR NEW.ban_reason IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.ban_reason ELSE NULL END) THEN
      RAISE EXCEPTION 'No autorizado para cambiar el bloqueo';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Un usuario bloqueado no puede crear contenido ni editar su perfil.
-- Son políticas RESTRICTIVE: se suman (AND) a las existentes.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['lfg_posts', 'teams', 'team_applications', 'team_invitations', 'registrations', 'scrims'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Banned: no insert" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Banned: no insert" ON public.%I AS RESTRICTIVE FOR INSERT WITH CHECK (NOT public.is_banned())', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Banned: no profile edit" ON public.profiles;
CREATE POLICY "Banned: no profile edit" ON public.profiles AS RESTRICTIVE FOR UPDATE
  USING (NOT public.is_banned() OR public.is_admin());

-- ── Reportes ─────────────────────────────────────────────────────────────────
-- target_type: 'post' (lfg_posts.id) o 'profile' (profiles.id).
-- snapshot guarda lo reportado por si luego se edita o borra.
CREATE TABLE IF NOT EXISTS public.reports (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type  TEXT NOT NULL CHECK (target_type IN ('post', 'profile')),
  target_id    UUID NOT NULL,
  reason       TEXT NOT NULL CHECK (reason IN ('spam', 'ofensivo', 'suplantacion', 'trampas', 'otro')),
  details      TEXT CHECK (char_length(details) <= 300),
  snapshot     JSONB NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (reporter_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status, created_at DESC);

-- ── Caché de estadísticas de partidas (deadlock-api.com) ─────────────────────
-- La escribe el servidor con la service role; lectura pública.
CREATE TABLE IF NOT EXISTS public.player_stats (
  profile_id  UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id  BIGINT NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}',
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Permisos y RLS ───────────────────────────────────────────────────────────
GRANT ALL ON public.reports, public.player_stats TO anon, authenticated, service_role;

ALTER TABLE public.reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reports: own insert"   ON public.reports;
DROP POLICY IF EXISTS "Reports: read"         ON public.reports;
DROP POLICY IF EXISTS "Reports: admin update" ON public.reports;
DROP POLICY IF EXISTS "Reports: admin delete" ON public.reports;
DROP POLICY IF EXISTS "Banned: no insert"     ON public.reports;
CREATE POLICY "Reports: own insert"   ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reports: read"         ON public.reports FOR SELECT USING (auth.uid() = reporter_id OR public.is_admin());
CREATE POLICY "Reports: admin update" ON public.reports FOR UPDATE USING (public.is_admin());
CREATE POLICY "Reports: admin delete" ON public.reports FOR DELETE USING (public.is_admin());
CREATE POLICY "Banned: no insert"     ON public.reports AS RESTRICTIVE FOR INSERT WITH CHECK (NOT public.is_banned());

DROP POLICY IF EXISTS "Player stats: public read" ON public.player_stats;
CREATE POLICY "Player stats: public read" ON public.player_stats FOR SELECT USING (TRUE);
