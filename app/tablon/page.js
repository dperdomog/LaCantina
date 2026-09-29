import { createClient } from '@/lib/supabase/server';
import TablonClient from '@/components/TablonClient';

const description = 'Busca equipo o jugadores para Deadlock en LATAM: publica tu rol, rango, país y horario.';
export const metadata = {
  title: 'Tablón — La Cantina',
  description,
  openGraph: { title: 'Tablón — La Cantina', description, images: ['/og.png'] },
};

export default async function TablonPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Publicaciones de los últimos 14 días
  const since = new Date(Date.now() - 14 * 24 * 3600e3).toISOString();
  const { data: posts } = await supabase
    .from('lfg_posts')
    .select(`
      id, kind, roles, rank_min, country, schedule, message, created_at, author_id, team_id,
      author:profiles!lfg_posts_author_id_fkey (id, display_name, discord_username, avatar_url, rank_badge),
      team:teams (id, name, slug, logo_url)
    `)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  // ¿El visitante es capitán? (para publicar como equipo)
  let captainTeam = null;
  let isAdmin     = false;
  let ban         = null;
  if (user) {
    const [{ data: team }, { data: me }, { data: banInfo }] = await Promise.all([
      supabase.from('teams').select('id, name').eq('captain_id', user.id).maybeSingle(),
      supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
      // Consulta aparte: si la columna no existe todavía, no rompe lo demás
      supabase.from('profiles').select('banned_at, ban_reason').eq('id', user.id).maybeSingle(),
    ]);
    captainTeam = team ?? null;
    isAdmin     = !!me?.is_admin;
    ban         = banInfo?.banned_at ? { reason: banInfo.ban_reason ?? null } : null;
  }

  return (
    <main className="max-w-[1180px] mx-auto px-5 py-14 md:py-20">
      <TablonClient
        posts={posts ?? []}
        viewer={user ? { id: user.id, captainTeam, isAdmin, banned: !!ban, banReason: ban?.reason ?? null } : null}
      />
    </main>
  );
}
